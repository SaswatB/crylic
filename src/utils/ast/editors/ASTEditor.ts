import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import {
  CodeEntry,
  ComponentDefinition,
  SourceMetadata,
  Styles,
} from "../../../types/paint";
import { editAST } from "../ast-helpers";

export interface StyleGroup {
  category: string;
  name: string;
  lookupId: string;
  editor: StyleASTEditor<any>;
}

export interface ReadContext<T> {
  ast: Readonly<T>;
  codeEntry: CodeEntry;
}

export interface EditContext<T> {
  ast: T;
  codeEntry: CodeEntry;
  lookupId: string;
}

abstract class ASTEditor<ASTType> {
  public addLookupData = editAST(this.addLookupDataToAST.bind(this));
  protected abstract addLookupDataToAST({
    ast,
    codeEntry,
  }: {
    ast: ASTType;
    codeEntry: CodeEntry;
  }): { lookupIds: string[] };

  public removeLookupData = editAST(this.removeLookupDataFromAST.bind(this));
  protected abstract removeLookupDataFromAST({
    ast,
    codeEntry,
  }: {
    ast: ASTType;
    codeEntry: CodeEntry;
  }): void;

  public onASTRender(iframe: HTMLIFrameElement) {}

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
  public abstract getStyleGroupsFromHTMLElement(
    element: HTMLElement
  ): StyleGroup[];

  public addStyles = editAST(this.addStylesToAST.bind(this));
  protected abstract addStylesToAST(
    editContext: EditContext<ASTType>,
    styles: Styles
  ): void;

  public updateElementImage = editAST(this.updateElementImageInAST.bind(this));
  protected abstract updateElementImageInAST(
    editContext: EditContext<ASTType>,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry
  ): void;
}

export abstract class ElementASTEditor<ASTType> extends StyleASTEditor<
  ASTType
> {
  public abstract getLookupIdFromHTMLElement(
    element: HTMLElement
  ): string | undefined;

  public abstract getLookupIdFromProps(props: any): string | undefined;

  public addChildToElement = editAST(this.addChildToElementInAST.bind(this));
  protected abstract addChildToElementInAST(
    editContext: EditContext<ASTType>,
    child: ComponentDefinition
  ): void;

  public updateElementAttributes = editAST(
    this.updateElementAttributesInAST.bind(this)
  );
  protected abstract updateElementAttributesInAST(
    editContext: EditContext<ASTType>,
    attributes: Record<string, unknown>
  ): void;

  public updateElementComponent = editAST(
    this.updateElementComponentInAST.bind(this)
  );
  protected abstract updateElementComponentInAST(
    editContext: EditContext<ASTType>,
    component: ComponentDefinition
  ): void;

  public updateElementText = editAST(this.updateElementTextInAST.bind(this));
  protected abstract updateElementTextInAST(
    editContext: EditContext<ASTType>,
    newTextContent: string
  ): void;

  public abstract getRecentlyAddedElements(
    readContext: ReadContext<ASTType>
  ): string[];

  public abstract getElementLookupIdAtCodePosition(
    readContext: ReadContext<ASTType>,
    line: number,
    column: number
  ): string | undefined;

  public abstract getSourceMetaDataFromLookupId(
    readContext: ReadContext<ASTType>,
    lookupId: string
  ): SourceMetadata | undefined;

  public abstract getHTMLElementByLookupId(
    document: Document,
    lookupId: string
  ): HTMLElement | undefined;

  public abstract getEditorDecorationsForElement(
    readContext: ReadContext<ASTType>,
    lookupId: string
  ): monaco.editor.IModelDeltaDecoration[];
}
