import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { CodeEntry, Styles } from "../../types/paint";
import { editAST } from "./ast-helpers";

export abstract class ASTEditor<T> {
  public addLookupData = editAST(this.addLookupDataToAST.bind(this));
  protected abstract addLookupDataToAST(
    ast: T,
    codeEntry: CodeEntry
  ): { lookupIds: string[] };

  public removeLookupData = editAST(this.removeLookupDataFromAST.bind(this));
  protected abstract removeLookupDataFromAST(
    ast: T,
    codeEntry: CodeEntry
  ): void;

  public onASTRender(iframe: HTMLIFrameElement) {}

  public abstract getLookupIdsFromHTMLElement(element: HTMLElement): string[];

  protected createLookupId(codeEntry: CodeEntry, elementIndex: number) {
    return `${codeEntry.id}-${elementIndex}`;
  }
  public getCodeIdFromLookupId(lookupId: string) {
    return lookupId.split("-")[0];
  }
  protected getElementIndexFromLookupId(lookupId: string) {
    return parseInt(lookupId.split("-")[1]);
  }
}

export abstract class StyleASTEditor<T> extends ASTEditor<T> {
  public addStyles = editAST(this.addStylesToAST.bind(this));
  protected abstract addStylesToAST(
    ast: T,
    codeEntry: CodeEntry,
    lookupId: string,
    styles: Styles
  ): void;
}

export abstract class ElementASTEditor<T> extends StyleASTEditor<T> {
  public addChildToElement = editAST(this.addChildToElementInAST.bind(this));
  protected abstract addChildToElementInAST(
    ast: T,
    codeEntry: CodeEntry,
    parentLookupId: string,
    elementTag: keyof HTMLElementTagNameMap,
    elementAttributes?: Record<string, unknown>
  ): void;

  public abstract getRecentlyAddedElements(
    ast: Readonly<T>,
    codeEntry: CodeEntry
  ): string[];

  public abstract getElementLookupIdAtCodePosition(
    ast: Readonly<T>,
    codeEntry: CodeEntry,
    line: number,
    column: number
  ): string | undefined;

  public abstract getHTMLElementByLookupId(
    document: Document,
    lookupId: string
  ): HTMLElement | undefined;

  public abstract getEditorDecorationsForElement(
    ast: Readonly<T>,
    codeEntry: CodeEntry,
    lookupId: string
  ): monaco.editor.IModelDeltaDecoration[];
  public abstract getEditorActionsForElement(
    ast: Readonly<T>,
    codeEntry: CodeEntry,
    lookupId: string
  ): void;
}
