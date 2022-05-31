import {
  ComponentDefinition,
  ImportDefinition,
  Styles,
} from "../../../types/paint";
import { SourceMetadata } from "../../../types/selected-element";
import { CodeEntry } from "../../project/CodeEntry";
import { editAST } from "../ast-helpers";

export interface StyleGroup {
  type: string;
  category: string;
  name: string;
  lookupId: string;
  editor: StyleASTEditor<any>;
}

export const INLINE_STYLE_GROUP_TYPE = "inline";
export const CSS_STYLE_GROUP_TYPE = "css";
export const STYLED_COMPONENTS_STYLE_GROUP_TYPE = "styled-components";

export interface ReadContext<T> {
  ast: Readonly<T>;
  codeEntry: CodeEntry;
}

export interface EditContext<T> {
  ast: T;
  codeEntry: CodeEntry;
  lookupId: string;
}

export async function createNewReadContext<T>(
  codeEntry: CodeEntry
): Promise<ReadContext<T>> {
  return { ast: (await codeEntry.getLatestAst()) as T, codeEntry };
}

export async function createNewEditContext<T>(
  codeEntry: CodeEntry,
  lookupId: string
): Promise<EditContext<T>> {
  return { ast: (await codeEntry.getLatestAst()) as T, codeEntry, lookupId };
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

  protected createLookupId(
    codeEntry: CodeEntry,
    editorTag: string,
    elementIndex: number
  ) {
    return `${codeEntry.id}-${editorTag}-${elementIndex}`;
  }
  public getCodeIdFromLookupId(lookupId: string) {
    return lookupId.split("-")[0];
  }
  protected getElementIndexFromLookupId(lookupId: string) {
    return parseInt(lookupId.split("-")[2]!);
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
    assetEntry: CodeEntry | null // null to delete
  ): void;

  public addStyleGroup = editAST(this.addStyleGroupToAST.bind(this)); // lookupId is ignored
  protected abstract addStyleGroupToAST(
    editContext: EditContext<ASTType>,
    name: string
  ): void;
}

export abstract class ElementASTEditor<
  ASTType
> extends StyleASTEditor<ASTType> {
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

  public addImport = editAST(this.addImportToAST.bind(this)); // lookupId is ignored
  protected abstract addImportToAST(
    editContext: EditContext<ASTType>,
    importDef: ImportDefinition
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

  public moveElement = editAST(this.moveElementInAST.bind(this));
  protected abstract moveElementInAST(
    editContext: EditContext<ASTType>,
    parentLookupId: string,
    beforeChildLookupId?: string
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
    lookupId: string,
    options?: { includeImports?: boolean; includeTopLevelVars?: boolean }
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
  public abstract getSourcePositionForElement(
    readContext: ReadContext<ASTType>,
    lookupId: string
  ): number | undefined;
}
