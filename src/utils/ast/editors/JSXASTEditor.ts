import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { pipe } from "fp-ts/lib/pipeable";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { types } from "recast";

import { CodeEntry, Styles } from "../../../types/paint";
import {
  copyJSXName,
  getValue,
  ifIdentifier,
  ifJSXAttribute,
  ifJSXExpressionContainer,
  ifObjectExpression,
  ifObjectProperty,
  ifStringLiteral,
  traverseJSXElements,
  valueToASTLiteral,
  valueToJSXLiteral,
} from "../ast-helpers";
import { ElementASTEditor } from "./ASTEditor";

const { builders: b } = types;

// fix missing token prop in types
declare module "ast-types/gen/namedTypes" {
  namespace namedTypes {
    interface Position {
      token?: number;
    }
  }
}

const JSX_LOOKUP_DATA_ATTR = "paintlookupid";
const JSX_RECENTLY_ADDED_DATA_ATTR = "paintlookupidnew";
const JSX_RECENTLY_ADDED = "new";

export class JSXASTEditor extends ElementASTEditor<t.File> {
  protected addLookupDataToAST(ast: t.File, codeEntry: CodeEntry) {
    let lookupIds: string[] = [];
    traverseJSXElements(ast, (path, index) => {
      const lookupId = this.createLookupId(codeEntry, index);
      const attr = b.jsxAttribute(
        b.jsxIdentifier(`data-${JSX_LOOKUP_DATA_ATTR}`),
        b.stringLiteral(lookupId)
      );
      path.value.openingElement.attributes?.push(attr);
      lookupIds.push(lookupId);
    });
    return {
      lookupIds,
    };
  }
  protected removeLookupDataFromAST(ast: t.File) {
    traverseJSXElements(ast, (path) => {
      const { openingElement } = path.value;
      openingElement.attributes = openingElement.attributes?.filter(
        (attr) =>
          ifJSXAttribute(attr)?.name.name !== `data-${JSX_LOOKUP_DATA_ATTR}` &&
          ifJSXAttribute(attr)?.name.name !==
            `data-${JSX_RECENTLY_ADDED_DATA_ATTR}`
      );
    });
  }

  public getLookupIdsFromHTMLElement(element: HTMLElement) {
    const lookupId = element.dataset?.[JSX_LOOKUP_DATA_ATTR];
    return lookupId ? [lookupId] : [];
  }

  protected addChildToElementInAST(
    ast: t.File,
    codeEntry: CodeEntry,
    parentLookupId: string,
    elementTag: keyof HTMLElementTagNameMap,
    elementAttributes?: Record<string, unknown>
  ) {
    let madeChange = false;
    this.editJSXElementByLookupId(ast, parentLookupId, (path) => {
      this.addJSXChildToJSXElement(path.value, elementTag, {
        ...elementAttributes,
        [`data-${JSX_RECENTLY_ADDED_DATA_ATTR}`]: JSX_RECENTLY_ADDED,
      });
      madeChange = true;
    });
    if (!madeChange)
      throw new Error(
        `Could not find parent element by lookup id ${parentLookupId}`
      );
  }

  public getRecentlyAddedElements(ast: Readonly<t.File>, codeEntry: CodeEntry) {
    let resultIndicies: number[] = [];
    traverseJSXElements(ast, (path, index) => {
      const hasRecentlyAddedDataAttr = path.value.openingElement.attributes?.find(
        (attr) =>
          ifJSXAttribute(attr)?.name.name ===
          `data-${JSX_RECENTLY_ADDED_DATA_ATTR}`
      );
      if (hasRecentlyAddedDataAttr) {
        resultIndicies.push(index);
      }
    });
    return resultIndicies.map((index) => this.createLookupId(codeEntry, index));
  }

  public getElementLookupIdAtCodePosition(
    ast: Readonly<t.File>,
    codeEntry: CodeEntry,
    line: number,
    column: number
  ) {
    // let result: NodePath<types.namedTypes.JSXElement, t.JSXElement> | undefined;
    let resultId: number | undefined;
    let tokenCount: number | undefined;
    traverseJSXElements(ast, (path, index) => {
      const { start, end } = path?.value?.loc || {};
      if (
        start &&
        end &&
        (line > start.line ||
          (line === start.line && column >= start.column)) &&
        (line < end.line || (line === end.line && column <= end.column)) &&
        (tokenCount === undefined ||
          tokenCount > (end.token || 0) - (start.token || 0))
      ) {
        // result = path;
        resultId = index;
        tokenCount = (end.token || 0) - (start.token || 0);
      }
    });
    return resultId !== undefined
      ? this.createLookupId(codeEntry, resultId)
      : undefined;
  }

  public getHTMLElementByLookupId(document: Document, lookupId: string) {
    return (
      document.querySelector<HTMLElement>(
        `[data-${JSX_LOOKUP_DATA_ATTR}="${lookupId}"]`
      ) || undefined
    );
  }

  public getEditorDecorationsForElement(
    ast: Readonly<t.File>,
    codeEntry: CodeEntry,
    lookupId: string
  ) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // try to find the jsx element in the ast
    const path = this.getJSXASTByLookupIndex(
      ast,
      this.getElementIndexFromLookupId(lookupId)
    );

    // get the start tag location
    const { start: openStart, end: openEnd } =
      path?.value?.openingElement?.name?.loc || {};
    if (openStart && openEnd) {
      decorations.push({
        range: new monaco.Range(
          openStart.line,
          openStart.column + 1,
          openEnd.line,
          openEnd.column + 1
        ),
        options: { inlineClassName: "selected-element-code-highlight" },
      });
    }
    // get the end tag location (may not be available for self-closing tags)
    const { start: closeStart, end: closeEnd } =
      path?.value?.closingElement?.name?.loc || {};
    if (closeStart && closeEnd) {
      decorations.push({
        range: new monaco.Range(
          closeStart.line,
          closeStart.column + 1,
          closeEnd.line,
          closeEnd.column + 1
        ),
        options: { inlineClassName: "selected-element-code-highlight" },
      });
    }
    return decorations;
  }

  protected addStylesToAST(
    ast: t.File,
    codeEntry: CodeEntry,
    lookupId: string,
    styles: Styles
  ) {
    let madeChange = false;
    this.editJSXElementByLookupId(ast, lookupId, (path) => {
      this.applyJSXInlineStyleAttribute(path, styles);
      madeChange = true;
    });
    if (!madeChange)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  // helpers

  protected getJSXASTByLookupIndex = (ast: t.File, lookupIndex: number) => {
    let result: NodePath<types.namedTypes.JSXElement, t.JSXElement> | undefined;
    traverseJSXElements(ast, (path, index) => {
      if (index === lookupIndex) result = path;
    });
    return result;
  };

  protected editJSXElementByLookupId(
    ast: t.File,
    lookupId: string,
    apply: (path: NodePath<types.namedTypes.JSXElement, t.JSXElement>) => void
  ) {
    traverseJSXElements(ast, (path) => {
      const lookupMatches = path.value.openingElement.attributes?.find(
        (attr) =>
          ifJSXAttribute(attr)?.name.name === `data-${JSX_LOOKUP_DATA_ATTR}` &&
          pipe(attr, ifJSXAttribute, getValue, ifStringLiteral, getValue) ===
            lookupId
      );
      if (lookupMatches) apply(path);
    });
  }

  protected addJSXChildToJSXElement(
    parentElement: t.JSXElement,
    childElementTag: keyof HTMLElementTagNameMap,
    childAttributes: Record<string, unknown> = {},
    childShouldBeSelfClosing = false
  ) {
    parentElement.children = [
      ...(parentElement.children || []),
      b.jsxElement(
        b.jsxOpeningElement(
          b.jsxIdentifier(childElementTag),
          Object.entries(childAttributes).map(([name, value]) =>
            b.jsxAttribute(b.jsxIdentifier(name), valueToJSXLiteral(value))
          ),
          childShouldBeSelfClosing
        ),
        childShouldBeSelfClosing
          ? undefined
          : b.jsxClosingElement(b.jsxIdentifier(childElementTag))
      ),
    ];
    // if the parent was self closing, open it up
    if (parentElement.openingElement.selfClosing) {
      parentElement.closingElement = b.jsxClosingElement(
        copyJSXName(parentElement.openingElement.name)
      );
      parentElement.openingElement.selfClosing = false;
    }
  }

  protected applyJSXInlineStyleAttribute(
    path: NodePath<types.namedTypes.JSXElement, t.JSXElement>,
    styles: Styles
  ) {
    let existingStyleAttr = path.value.openingElement.attributes?.find(
      (attr) => attr.type === "JSXAttribute" && attr.name.name === `style`
    );
    if (!existingStyleAttr) {
      path.value.openingElement.attributes =
        path.value.openingElement.attributes || [];
      existingStyleAttr = b.jsxAttribute(
        b.jsxIdentifier("style"),
        valueToJSXLiteral({})
      );
      path.value.openingElement.attributes.push(existingStyleAttr);
    }
    styles.forEach(({ styleName, styleValue }) => {
      // todo handle more cases
      const existingStyleProp = pipe(
        existingStyleAttr,
        ifJSXAttribute,
        getValue,
        ifJSXExpressionContainer,
        (_) => _?.expression,
        ifObjectExpression,
        (_) => _?.properties
      )?.find(
        (prop): prop is t.ObjectProperty =>
          pipe(
            prop,
            ifObjectProperty,
            (_) => _?.key,
            ifIdentifier,
            (_) => _?.name
          ) === styleName
      );
      console.log("existingStyleProp", existingStyleProp);
      if (existingStyleProp) {
        existingStyleProp.value = valueToASTLiteral(styleValue);
        return;
      }
      const existingStylePropObject = pipe(
        existingStyleAttr,
        ifJSXAttribute,
        getValue,
        ifJSXExpressionContainer,
        (_) => _?.expression,
        ifObjectExpression,
        (_) => _?.properties
      );
      existingStylePropObject?.push(
        b.objectProperty(
          b.identifier(`${styleName}`),
          valueToASTLiteral(styleValue)
        )
      );
    });
  }
}
