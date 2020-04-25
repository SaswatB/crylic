import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { CodeEntry, Styles } from "../../../types/paint";
import { editAST } from "../ast-helpers";

abstract class ASTEditor<ASTType> {
  public addLookupData = editAST(this.addLookupDataToAST.bind(this));
  protected abstract addLookupDataToAST(
    ast: ASTType,
    codeEntry: CodeEntry
  ): { lookupIds: string[] };

  public removeLookupData = editAST(this.removeLookupDataFromAST.bind(this));
  protected abstract removeLookupDataFromAST(
    ast: ASTType,
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

export abstract class StyleASTEditor<ASTType> extends ASTEditor<ASTType> {
  public addStyles = editAST(this.addStylesToAST.bind(this));
  protected abstract addStylesToAST(
    ast: ASTType,
    codeEntry: CodeEntry,
    lookupId: string,
    styles: Styles
  ): void;
}

export abstract class ElementASTEditor<ASTType> extends StyleASTEditor<
  ASTType
> {
  public addChildToElement = editAST(this.addChildToElementInAST.bind(this));
  protected abstract addChildToElementInAST(
    ast: ASTType,
    codeEntry: CodeEntry,
    parentLookupId: string,
    elementTag: keyof HTMLElementTagNameMap,
    elementAttributes?: Record<string, unknown>
  ): void;

  public abstract getRecentlyAddedElements(
    ast: Readonly<ASTType>,
    codeEntry: CodeEntry
  ): string[];

  public abstract getElementLookupIdAtCodePosition(
    ast: Readonly<ASTType>,
    codeEntry: CodeEntry,
    line: number,
    column: number
  ): string | undefined;

  public abstract getHTMLElementByLookupId(
    document: Document,
    lookupId: string
  ): HTMLElement | undefined;

  public abstract getEditorDecorationsForElement(
    ast: Readonly<ASTType>,
    codeEntry: CodeEntry,
    lookupId: string
  ): monaco.editor.IModelDeltaDecoration[];
}
