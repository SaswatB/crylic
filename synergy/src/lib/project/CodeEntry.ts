import { namedTypes as t } from "ast-types";
import clone from "clone";
import deepFreeze from "deep-freeze-strict";
import { camelCase, startCase, upperFirst } from "lodash";
import path from "path";
import { BehaviorSubject } from "rxjs";
import { map, shareReplay } from "rxjs/operators";

import { memoize } from "../../vendor/ts-memoize";
import {
  getComponentExport,
  hashString,
  parseCodeEntryAST,
  prettyPrintCodeEntryAST,
  printCodeEntryAST,
} from "../ast/ast-helpers";
import { ASTType } from "../ast/types";
import { Project } from "./Project";

export const STYLE_EXTENSION_REGEX = /\.(css|s[ac]ss|less)$/i;
export const SCRIPT_EXTENSION_REGEX = /\.[jt]sx?$/i;
export const IMAGE_EXTENSION_REGEX = /\.(jpe?g|png|gif|svg)$/i;

/**
 * A partial, resolved CodeEntry for use with remote async code
 */
export interface RemoteCodeEntry {
  code: string | undefined;
  isStyleEntry: CodeEntry["isStyleEntry"];
  styleEntryExtension: CodeEntry["styleEntryExtension"];
}

export class CodeEntry {
  public readonly id = hashString(this.filePath);
  public readonly code$ = new BehaviorSubject(this._code);

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
      isStyleEntry: this.isStyleEntry,
      styleEntryExtension: this.styleEntryExtension,
    };
  }

  // #region metadata

  private metadata$ = this.code$.pipe(
    map(() => {
      if (!this.isScriptEntry && !this.isStyleEntry) {
        return { isRenderable: false };
      }

      try {
        // parse ast data
        let ast = parseCodeEntryAST(this.getRemoteCodeEntry());

        // check if the file is a component
        let isRenderable = false;
        let exportName = undefined;
        let exportIsDefault = undefined;
        if (this.isRenderableScriptExtension() || this.isBootstrap()) {
          const componentExport = getComponentExport(ast as t.File);
          const baseComponentName = upperFirst(
            camelCase(
              path.basename(this.filePath).replace(SCRIPT_EXTENSION_REGEX, "")
            )
          );
          if (componentExport) {
            isRenderable = !this.isBootstrap();
            exportName = componentExport.name || baseComponentName;
            exportIsDefault =
              this.project.config.configFile?.analyzer
                ?.forceUseComponentDefaultExports || componentExport.isDefault;
          } else if (
            this.project.config.configFile?.analyzer
              ?.disableComponentExportsGuard
          ) {
            // since static analysis failed but we still need allow this file as a component guess that it's a default export
            isRenderable = !this.isBootstrap();
            exportName = baseComponentName;
            exportIsDefault = true;
          }
        }

        // return the modified ast and code
        console.log("compute metadata", this.filePath);
        return {
          rawAst: ast, // this might get modified if ast$ is run
          isRenderable,
          // this code entry has to be a script or style entry by this point so it's editable
          exportName,
          exportIsDefault,
        };
      } catch (e) {
        console.trace("compute metadata failed", e);
        return { isRenderable: false };
      }
    }),
    shareReplay(1)
  );

  public readonly isRenderable$ = this.metadata$.pipe(
    map((m) => m.isRenderable)
  );
  public readonly exportName$ = this.metadata$.pipe(map((m) => m.exportName));
  public readonly exportIsDefault$ = this.metadata$.pipe(
    map((m) => m.exportIsDefault)
  );
  public readonly ast$ = this.metadata$.pipe(
    map((m) => {
      if (!m.rawAst) return undefined;

      let ast = m.rawAst;

      // add lookup data from each editor to the ast
      this.project.getEditorsForCodeEntry(this).forEach((editor) => {
        const lookupData = editor.addLookupData({ ast, codeEntry: this });
        ast = lookupData.ast;
      });

      console.log("compute ast", this.filePath);
      return deepFreeze(clone(ast, undefined, undefined, undefined, true));
    }),
    shareReplay(1)
  );
  public readonly codeWithLookupData$ = this.ast$.pipe(
    map((ast) =>
      ast ? printCodeEntryAST(this.getRemoteCodeEntry(), ast) : undefined
    ),
    shareReplay(1)
  );

  // #endregion
}
