import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { pipe } from "fp-ts/lib/pipeable";
import { startCase } from "lodash";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { types } from "recast";

import { CodeEntry, Styles } from "../../../types/paint";
import {
  copyJSXName,
  getValue,
  ifIdentifier,
  ifJSXAttribute,
  ifJSXElement,
  ifJSXExpressionContainer,
  ifObjectExpression,
  ifObjectProperty,
  ifStringLiteral,
  traverseJSXElements,
  valueToJSXLiteral,
} from "../ast-helpers";
import { ElementASTEditor, StyleGroup } from "./ASTEditor";

const path = __non_webpack_require__("path") as typeof import("path");

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

  public getLookupIdFromHTMLElement(element: HTMLElement) {
    return element.dataset?.[JSX_LOOKUP_DATA_ATTR];
  }
  public getLookupIdFromProps(props: any) {
    return props?.[`data-${JSX_LOOKUP_DATA_ATTR}`];
  }

  public getStyleGroupsFromHTMLElement(element: HTMLElement): StyleGroup[] {
    const lookupId = this.getLookupIdFromHTMLElement(element);
    if (!lookupId) return [];
    return [
      {
        category: "Inline",
        name: "Element Style",
        lookupId,
        editor: this,
      },
    ];
  }

  protected addChildToElementInAST(
    ast: t.File,
    codeEntry: CodeEntry,
    parentLookupId: string,
    childTag: keyof HTMLElementTagNameMap | string,
    childAttributes?: Record<string, unknown>
  ) {
    // ensure the import for react-router-dom components
    if (childTag === "Route" || childTag === "Link") {
      childTag = this.getOrAddImport(ast, {
        path: "react-router-dom",
        name: childTag,
      });
    }

    this.editJSXElementByLookupId(ast, parentLookupId, (path) => {
      this.addJSXChildToJSXElement(
        path.value,
        childTag,
        {
          ...childAttributes,
          [`data-${JSX_RECENTLY_ADDED_DATA_ATTR}`]: JSX_RECENTLY_ADDED,
        },
        {
          orderByPathProp: childTag === "Route",
        }
      );
    });
  }

  protected updateElementTextInAST(
    ast: t.File,
    codeEntry: CodeEntry,
    lookupId: string,
    newTextContent: string
  ) {
    this.editJSXElementByLookupId(ast, lookupId, (path) => {
      console.log(path);
      const textNode = path.value.children?.find(
        (child): child is t.JSXText => child.type === "JSXText"
      );
      if (textNode) {
        textNode.value = newTextContent;
      } else {
        path.value.children = path.value.children || [];
        path.value.children.push(b.jsxText(newTextContent));
      }
    });
  }

  protected updateElementImageInAST(
    ast: t.File,
    codeEntry: CodeEntry,
    lookupId: string,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry
  ) {
    // get the import for the asset
    const relativeAssetPath = path
      .relative(path.dirname(codeEntry.filePath), assetEntry.filePath)
      .replace(/\\/g, "/");
    const assetDefaultName = `Asset${startCase(
      path.basename(assetEntry.filePath).replace(/\..*$/, "")
    ).replace(/\s+/g, "")}`;
    const assetIdentifier = this.getOrAddImport(ast, {
      path: relativeAssetPath,
      name: assetDefaultName,
      isDefault: true,
    });

    this.editJSXElementByLookupId(ast, lookupId, (path) => {
      console.log("updateElementImageInAST", path, assetIdentifier);
      // edit the element style
      this.applyJSXInlineStyleAttribute(path, [
        {
          styleName: imageProp,
          // set the image through a template literal
          styleValue: b.templateLiteral(
            [
              b.templateElement({ raw: "url(", cooked: "url(" }, false),
              b.templateElement({ raw: ")", cooked: ")" }, true),
            ],
            [b.identifier(assetIdentifier)]
          ),
        },
      ]);
    });
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
    this.editJSXElementByLookupId(ast, lookupId, (path) =>
      this.applyJSXInlineStyleAttribute(
        path,
        styles.map((style) => ({
          styleName: style.styleName,
          styleValue: b.stringLiteral(style.styleValue),
        }))
      )
    );
  }

  // helpers

  protected getJSXASTByLookupIndex(ast: t.File, lookupIndex: number) {
    let result: NodePath<types.namedTypes.JSXElement, t.JSXElement> | undefined;
    traverseJSXElements(ast, (path, index) => {
      if (index === lookupIndex) result = path;
    });
    return result;
  }

  protected editJSXElementByLookupId(
    ast: t.File,
    lookupId: string,
    apply: (path: NodePath<types.namedTypes.JSXElement, t.JSXElement>) => void
  ) {
    let madeChange = false;
    traverseJSXElements(ast, (path) => {
      const lookupMatches = path.value.openingElement.attributes?.find(
        (attr) =>
          ifJSXAttribute(attr)?.name.name === `data-${JSX_LOOKUP_DATA_ATTR}` &&
          pipe(attr, ifJSXAttribute, getValue, ifStringLiteral, getValue) ===
            lookupId
      );
      if (lookupMatches) {
        madeChange = true;
        apply(path);
      }
    });
    if (!madeChange)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  protected addJSXChildToJSXElement(
    parentElement: t.JSXElement,
    childElementTag: keyof HTMLElementTagNameMap | string,
    childAttributes: Record<string, unknown> = {},
    childOptions?: {
      shouldBeSelfClosing?: boolean;
      // `Route` specific ordering option
      orderByPathProp?: boolean;
    }
  ) {
    const child = b.jsxElement(
      b.jsxOpeningElement(
        b.jsxIdentifier(childElementTag),
        Object.entries(childAttributes).map(([name, value]) =>
          b.jsxAttribute(b.jsxIdentifier(name), valueToJSXLiteral(value))
        ),
        childOptions?.shouldBeSelfClosing ?? false
      ),
      childOptions?.shouldBeSelfClosing
        ? undefined
        : b.jsxClosingElement(b.jsxIdentifier(childElementTag))
    );

    // add the child to the parent
    parentElement.children = [...(parentElement.children || [])];
    if (
      childOptions?.orderByPathProp &&
      typeof childAttributes.path === "string"
    ) {
      let insertIndex = -1;
      // order based on path specificity
      parentElement.children.forEach((existingChild, index) => {
        const existingChildPath = pipe(
          existingChild,
          ifJSXElement,
          (_) =>
            _?.openingElement.attributes?.find(
              (attr): attr is t.JSXAttribute =>
                attr.type === "JSXAttribute" && attr.name.name === "path"
            ),
          getValue,
          ifStringLiteral,
          getValue
        );
        if (
          existingChildPath &&
          existingChildPath.includes(childAttributes.path as string)
        ) {
          insertIndex = index;
        }
      });
      parentElement.children.splice(insertIndex + 1, 0, child);
    } else {
      parentElement.children.push(child);
    }

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
    styles: {
      styleName: keyof CSSStyleDeclaration;
      styleValue: t.StringLiteral | t.TemplateLiteral;
    }[]
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
        existingStyleProp.value = styleValue;
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
        b.objectProperty(b.identifier(`${styleName}`), styleValue)
      );
    });
  }

  protected getOrAddImport(
    ast: t.File,
    importTarget: { path: string; name: string; isDefault?: boolean }
  ) {
    // try to find an existing import declaration
    let assetImport = ast.program.body.find(
      (node): node is t.ImportDeclaration =>
        node.type === "ImportDeclaration" &&
        node.source.type === "StringLiteral" &&
        node.source.value === importTarget.path
    );
    // add an import declaration if none is found
    if (!assetImport) {
      let lastImportIndex = -1;
      ast.program.body.forEach((node, index) => {
        if (node.type === "ImportDeclaration") lastImportIndex = index;
      });
      assetImport = b.importDeclaration(
        [
          // identifier added below
        ],
        b.stringLiteral(importTarget.path)
      );
      ast.program.body.splice(lastImportIndex, 0, assetImport);
    }
    // try to find a default export on the import declaration
    let assetImportIdentifier = assetImport!.specifiers?.find((node): node is
      | t.ImportDefaultSpecifier
      | t.ImportSpecifier =>
      importTarget.isDefault
        ? node.type === "ImportDefaultSpecifier"
        : node.type === "ImportSpecifier" &&
          node.imported.name === importTarget.name
    );
    // add a default import if none is found
    if (!assetImportIdentifier) {
      assetImportIdentifier = importTarget.isDefault
        ? b.importDefaultSpecifier(b.identifier(importTarget.name))
        : // todo add local if there's a name conflict
          b.importSpecifier(b.identifier(importTarget.name));
      assetImport.specifiers = assetImport.specifiers || [];
      assetImport.specifiers.push(assetImportIdentifier);
    }

    return assetImportIdentifier.local!.name;
  }
}
