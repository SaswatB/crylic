import { startCase } from "lodash";
import path from "path";

import { memoize } from "../../vendor/ts-memoize";
import {
  hashString,
  prettyPrintCodeEntryAST,
  printCodeEntryAST,
} from "../ast/ast-helpers";
import { queueAstPoolAction } from "../ast/ast-pool";
import type { AstWorkerModule } from "../ast/ast-worker";
import { ASTType } from "../ast/types";
import {
  IMAGE_EXTENSION_REGEX,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "../ext-regex";
import { LTBehaviorSubject } from "../lightObservable/LTBehaviorSubject";
import { ltMap } from "../lightObservable/LTOperator";
import { Project } from "./Project";

/**
 * A partial, resolved CodeEntry for use with remote async code
 */
export interface RemoteCodeEntry {
  code: string | undefined;
  filePath: string;
  isBootstrap: boolean;
  isRenderableScriptExtension: boolean;
  isStyleEntry: boolean;
  styleEntryExtension: CodeEntry["styleEntryExtension"];

  config: {
    forceUseComponentDefaultExports: boolean;
    disableComponentExportsGuard: boolean;
  };
}

export class CodeEntry {
  public readonly id = hashString(this.filePath);
  public readonly code$ = new LTBehaviorSubject(this._code);

  public constructor(
    private readonly project: Project,
    public readonly filePath: string,
    private _code: string | undefined,
    private _codeRevisionId = 1
  ) {}

  public get codeRevisionId() {
    return this._codeRevisionId;
  }

  public updateCode(code: string) {
    // lm_d1c6d7683b this is assumed to be synchronous
    this.code$.next(code);
    this._codeRevisionId++;
  }

  public updateAst(editedAst: ASTType) {
    // remove lookup data from the ast and get the transformed code
    this.project.getEditorsForCodeEntry(this).forEach((editor) => {
      editedAst = editor.removeLookupData({ ast: editedAst, codeEntry: this });
    });

    // save the edited code
    this.updateCode(
      prettyPrintCodeEntryAST(
        this.project.config,
        this.getRemoteCodeEntry(),
        editedAst
      )
    );
  }

  // #region filePath getters

  @memoize()
  public get isScriptEntry() {
    return !!this.filePath.match(SCRIPT_EXTENSION_REGEX);
  }
  @memoize()
  public get isStyleEntry() {
    return !!this.filePath.match(STYLE_EXTENSION_REGEX);
  }
  @memoize()
  public get isImageEntry() {
    return !!this.filePath.match(IMAGE_EXTENSION_REGEX);
  }

  @memoize()
  public get isEditable() {
    return this.isScriptEntry || this.isStyleEntry || this.isImageEntry;
  }

  @memoize()
  public get styleEntryExtension() {
    return this.filePath.match(STYLE_EXTENSION_REGEX)?.[1] as
      | "css"
      | "scss"
      | "sass"
      | "less"
      | undefined;
  }

  @memoize()
  public get fileExtensionLanguage() {
    if (this.filePath.match(/\.[jt]sx?$/)) {
      return "typescript";
    } else if (this.filePath.match(/\.css$/)) {
      return "css";
    } else if (this.filePath.match(/\.s[ac]ss$/)) {
      return "scss";
    } else if (this.filePath.match(/\.less$/)) {
      return "less";
    } else if (this.filePath.match(/\.(svg|html)$/)) {
      return "html";
    }
    return undefined;
  }

  @memoize()
  public get friendlyName() {
    const fileName = this.filePath
      ?.replace(/^.*(\/|\\)/, "")
      ?.replace(SCRIPT_EXTENSION_REGEX, "")
      ?.replace(STYLE_EXTENSION_REGEX, "");
    if (!this.isScriptEntry && !this.isStyleEntry) {
      return fileName;
    }
    // todo get a more specific name if this simple name conflicts with another code entry
    return `${startCase(fileName)}${this.isStyleEntry ? " (stylesheet)" : ""}`;
  }

  // #endregion

  public getRelativeImportPath(target: string) {
    if (!target.startsWith("/") && !target.includes(":")) return target;

    // make absolute paths relative
    let newPath = path
      .relative(path.dirname(this.filePath.replace(/\\/g, "/")), target)
      .replace(/\\/g, "/")
      .replace(SCRIPT_EXTENSION_REGEX, "");

    if (!newPath.startsWith(".")) {
      newPath = `./${newPath}`;
    }
    return newPath;
  }

  public isBootstrap() {
    const projectBootstrap = this.project.config?.configFile?.bootstrap;
    return (
      !!projectBootstrap &&
      path.join(this.project.path, projectBootstrap).replace(/\\/g, "/") ===
        this.filePath.replace(/\\/g, "/")
    );
  }

  protected isRenderableScriptExtension() {
    // todo add an option to support other types of scripts
    return (
      this.isScriptEntry &&
      // by default component files must start with an uppercase letter
      (this.project.config.configFile?.analyzer?.allowLowerCaseComponentFiles ||
        !!this.filePath.match(/(^|\\|\/)[A-Z][^/\\]*$/)) &&
      // by default test and declaration files are ignored)
      (this.project.config.configFile?.analyzer?.allowTestComponentFiles ||
        !this.filePath.match(/\.test\.[jt]sx?$/)) &&
      (this.project.config.configFile?.analyzer
        ?.allowDeclarationComponentFiles ||
        !this.filePath.match(/\.d\.ts$/))
    );
  }

  public getRemoteCodeEntry(): RemoteCodeEntry {
    return {
      code: this.code$.getValue(),
      filePath: this.filePath,
      isBootstrap: this.isBootstrap(),
      isRenderableScriptExtension: this.isRenderableScriptExtension(),
      isStyleEntry: this.isStyleEntry,
      styleEntryExtension: this.styleEntryExtension,

      config: {
        forceUseComponentDefaultExports:
          this.project.config.configFile?.analyzer
            ?.forceUseComponentDefaultExports ?? false,
        disableComponentExportsGuard:
          this.project.config.configFile?.analyzer
            ?.disableComponentExportsGuard ?? false,
      },
    };
  }

  // #region metadata

  private metadata$ = this.code$.pipe(
    ltMap(
      async (): Promise<
        Partial<Awaited<ReturnType<AstWorkerModule["computeMetadata"]>>>
      > => {
        if (!this.isScriptEntry && !this.isStyleEntry) {
          return { isRenderable: false };
        }

        try {
          // return the modified ast and code
          console.log("compute metadata", this.filePath);

          // await new Promise((resolve) => requestAnimationFrame(resolve));

          return await queueAstPoolAction(
            "computeMetadata",
            this.getRemoteCodeEntry()
          );
        } catch (e) {
          console.trace("compute metadata failed", e);
          return { isRenderable: false };
        }
      }
    )
  );

  public readonly isRenderable$ = this.metadata$.pipe(
    ltMap((metadata) => !!metadata.isRenderable)
  );
  public readonly exportName$ = this.metadata$.pipe(ltMap((m) => m.exportName));
  public readonly exportIsDefault$ = this.metadata$.pipe(
    ltMap((m) => m.exportIsDefault)
  );
  public readonly ast$ = this.metadata$.pipe(
    ltMap((m): any => {
      if (!m.rawAst) return undefined;

      let ast = m.rawAst;
      console.time("compute ast " + this.filePath);

      // add lookup data from each editor to the ast
      this.project.getEditorsForCodeEntry(this).forEach((editor) => {
        const lookupData = editor.addLookupData({ ast, codeEntry: this });
        ast = lookupData.ast;
        console.timeLog(
          "compute ast " + this.filePath,
          editor.constructor.name
        );
      });

      const res = ast; // deepFreeze(clone(ast, undefined, undefined, undefined, true));

      console.timeEnd("compute ast " + this.filePath);

      return res;
    })
  );
  public readonly codeWithLookupData$ = this.ast$.pipe(
    ltMap((ast) =>
      ast ? printCodeEntryAST(this.getRemoteCodeEntry(), ast) : undefined
    )
  );

  // #endregion
}
