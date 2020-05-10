import deepFreeze from "deep-freeze-strict";
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
import { isScriptEntry, isStyleEntry } from "./utils";

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

  constructor(
    public readonly path: string,
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
