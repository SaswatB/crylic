import { ComponentDefinition, Styles } from "../../../types/paint";
import { SourceMetadata } from "../../../types/selected-element";
import { CodeEntry } from "../../project/CodeEntry";
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

export abstract class ASTEditor<ASTType> {
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
    return parseInt(lookupId.split("-")[1]!);
  }
  public abstract getCodeLineFromLookupId(
    readContext: ReadContext<ASTType>,
    lookupId: string
  ): number | undefined;
}

export abstract class StyleASTEditor<ASTType> extends ASTEditor<ASTType> {
  public abstract getStyleGroupsFromHTMLElement(
    element: HTMLElement
  ): StyleGroup[];

  public applyStyles = editAST(this.applyStylesToAST.bind(this));
  protected abstract applyStylesToAST(
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
    child: ComponentDefinition,
    beforeChildLookupId?: string
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

  public deleteElement = editAST(this.deleteElementInAST.bind(this));
  protected abstract deleteElementInAST(
    editContext: EditContext<ASTType>
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

  public abstract getHTMLElementsByLookupId(
    document: Document,
    lookupId: string
  ): HTMLElement[];

  public abstract getEditorDecorationsForElement(
    readContext: ReadContext<ASTType>,
    lookupId: string
  ): {
    // compatible with monaco.editor.IModelDeltaDecoration
    range: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    options: {
      className?: string | null;
      isWholeLine?: boolean;
      zIndex?: number;
      glyphMarginClassName?: string | null;
      linesDecorationsClassName?: string | null;
      marginClassName?: string | null;
      inlineClassName?: string | null;
      inlineClassNameAffectsLetterSpacing?: boolean;
      beforeContentClassName?: string | null;
      afterContentClassName?: string | null;
    };
  }[];
}
