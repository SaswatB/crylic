import deepFreeze from "deep-freeze-strict";
import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import produce, { immerable } from "immer";
import { cloneDeep } from "lodash";

import { CodeEntry, ProjectConfig } from "../types/paint";
import {
  hasComponentExport,
  hashString,
  parseCodeEntryAST,
  printCodeEntryAST,
} from "./ast/ast-helpers";
import { ElementASTEditor, StyleASTEditor } from "./ast/editors/ASTEditor";
import { JSXASTEditor } from "./ast/editors/JSXASTEditor";
import { StyledASTEditor } from "./ast/editors/StyledASTEditor";
import { StyleSheetASTEditor } from "./ast/editors/StyleSheetASTEditor";
import { CONFIG_FILE_NAME, DEFAULT_PROJECT_SOURCE_FOLDER } from "./constants";
import {
  isScriptEntry,
  isStyleEntry,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "./utils";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const path = __non_webpack_require__("path") as typeof import("path");

type EditorEntry<T> = {
  shouldApply: (entry: CodeEntry) => boolean;
  editor: T;
};

export class Project {
  private [immerable] = true; // enable immer support

  public readonly codeEntries: CodeEntry[] = [];
  public readonly elementEditorEntries: EditorEntry<ElementASTEditor<any>>[];
  public readonly styleEditorEntries: EditorEntry<StyleASTEditor<any>>[];

  private constructor(
    public readonly path: string,
    public readonly sourceFolderName: string,
    public readonly config?: ProjectConfig
  ) {
    this.elementEditorEntries = [
      { editor: new JSXASTEditor(), shouldApply: isScriptEntry },
    ];
    this.styleEditorEntries = [
      { editor: new StyledASTEditor(), shouldApply: isScriptEntry },
      { editor: new StyleSheetASTEditor(), shouldApply: isStyleEntry },
    ];
  }

  public static createProject(folderPath: string) {
    let config;
    const fileCodeEntries: { filePath: string; code: string }[] = [];

    const configFilePath = path.join(folderPath, CONFIG_FILE_NAME);
    if (fs.existsSync(configFilePath)) {
      // todo use a more secure require/allow async
      config = pipe(
        configFilePath,
        // require the config file
        __non_webpack_require__ as (p: string) => any,
        // parse the config file
        ProjectConfig.decode,
        fold(
          // log any errors
          (e) => {
            console.log(e);
            return undefined;
          },
          (config) => config
        )
      );
    }
    const srcFolderName = config?.sourceFolder || DEFAULT_PROJECT_SOURCE_FOLDER;
    const srcFolderPath = path.join(folderPath, srcFolderName);
    if (fs.existsSync(srcFolderPath)) {
      // recursive function for creating code entries from a folder
      const read = (subFolderPath: string) =>
        fs.readdirSync(subFolderPath).forEach((file) => {
          const filePath = path.join(subFolderPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            // recurse through the directory's children
            read(filePath);
          } else if (
            (file.match(SCRIPT_EXTENSION_REGEX) ||
              file.match(STYLE_EXTENSION_REGEX)) &&
            !file.match(/\.(test|d)\.[jt]sx?$/)
          ) {
            // add scripts/styles that aren't test or declaration files
            fileCodeEntries.push({
              filePath,
              code: fs.readFileSync(filePath, { encoding: "utf-8" }),
            });
          }
        });
      // read all files within the source folder
      read(srcFolderPath);
    }

    return new Project(folderPath, srcFolderName, config).addCodeEntries(
      ...fileCodeEntries
    );
  }

  public saveFiles() {
    this.codeEntries.forEach(({ filePath, code }) =>
      fs.writeFileSync(filePath, code)
    );
  }

  public get editorEntries() {
    return [...this.elementEditorEntries, ...this.styleEditorEntries];
  }

  public get primaryElementEditor() {
    return this.elementEditorEntries[0].editor;
  }

  public getEditorsForCodeEntry(codeEntry: CodeEntry) {
    return this.editorEntries
      .filter(({ shouldApply }) => shouldApply(codeEntry))
      .map(({ editor }) => editor);
  }

  public getCodeEntry(codeId: string) {
    return this.codeEntries.find(({ id }) => id === codeId);
  }

  public getNewComponentPath(name: string) {
    return path.join(this.path, `src/components/${name}.tsx`);
  }

  public getNewStyleSheetPath(name: string) {
    return path.join(this.path, `src/styles/${name}.css`);
  }

  // Project is immutable so these functions return a new copy with modifications

  public addCodeEntries(
    ...partialEntries: (Partial<CodeEntry> & { filePath: string })[]
  ) {
    return produce(this, (draft) => {
      partialEntries.forEach((partialEntry) => {
        const codeEntry = {
          id: hashString(partialEntry.filePath),
          code: "",
          edit: false,
          render: false,
          ...partialEntry,
        };
        draft.codeEntries.push({
          ...codeEntry,
          ...this.getCodeEntryMetaData(codeEntry),
        });
      });
    });
  }

  public editCodeEntry(codeId: string, updates: Partial<CodeEntry>) {
    return produce(this, (draft) => {
      const codeEntry = draft?.codeEntries.find(({ id }) => id === codeId);
      if (!codeEntry) return;

      Object.entries(updates).forEach(([key, value]) => {
        // @ts-ignore ignore assignment
        codeEntry[key] = value;

        // recalculate metadata on code change
        if (key === "code") {
          const { ast, codeWithLookupData } = this.getCodeEntryMetaData(
            codeEntry
          );
          codeEntry.ast = ast;
          codeEntry.codeWithLookupData = codeWithLookupData;
        }
      });
    });
  }

  private getCodeEntryMetaData(codeEntry: CodeEntry) {
    if (!isScriptEntry(codeEntry) && !isStyleEntry(codeEntry)) {
      return {};
    }

    try {
      // parse ast data
      let ast = parseCodeEntryAST(codeEntry);

      const isBootstrap =
        this.config?.bootstrap &&
        path.join(this.path, this.config.bootstrap) === codeEntry.filePath;
      const isComponent =
        isScriptEntry(codeEntry) &&
        !isBootstrap &&
        // todo add an option to disable this check (component files must start with an uppercase letter)
        !!codeEntry.filePath.match(/(^|\\|\/)[A-Z][^/\\]*$/) &&
        hasComponentExport(ast as any);

      // add lookup data from each editor to the ast
      this.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
        ({ ast } = editor.addLookupData(ast, codeEntry));
      });
      // return the modified ast and code
      console.log("codeTransformer", codeEntry.filePath, ast);
      return {
        ast: deepFreeze(cloneDeep(ast)),
        codeWithLookupData: printCodeEntryAST(codeEntry, ast),
        isComponent,
      };
    } catch (e) {
      console.log(e);
      return {};
    }
  }
}
