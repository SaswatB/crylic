import { immerable } from "immer";

import { CodeEntry, ProjectConfig } from "../types/paint";
import { ElementASTEditor, StyleASTEditor } from "./ast/editors/ASTEditor";
import { JSXASTEditor } from "./ast/editors/JSXASTEditor";
import { StyledASTEditor } from "./ast/editors/StyledASTEditor";
import { StyleSheetASTEditor } from "./ast/editors/StyleSheetASTEditor";
import { isScriptEntry, isStyleEntry } from "./utils";

type EditorEntry<T> = {
  shouldApply: (entry: CodeEntry) => boolean;
  editor: T;
};

export class Project {
  private [immerable] = true; // enable immer support

  public readonly elementEditorEntries: EditorEntry<ElementASTEditor<any>>[];
  public readonly styleEditorEntries: EditorEntry<StyleASTEditor<any>>[];

  constructor(
    public readonly path: string,
    public readonly codeEntries: CodeEntry[],
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
}
