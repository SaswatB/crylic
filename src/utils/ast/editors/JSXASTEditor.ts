import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { pipe } from "fp-ts/lib/pipeable";
import { startCase } from "lodash";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { types } from "recast";

import { CodeEntry, SourceMetadata, Styles } from "../../../types/paint";
import { getRelativeImportPath } from "../../utils";
import {
  copyJSXName,
  getValue,
  ifIdentifier,
  ifJSXAttribute,
  ifJSXElement,
  ifJSXExpressionContainer,
  ifJSXIdentifier,
  ifObjectExpression,
  ifObjectProperty,
  ifStringLiteral,
  jsxLiteralToValue,
  traverseJSXElements,
  valueToJSXLiteral,
} from "../ast-helpers";
import {
  EditContext,
  ElementASTEditor,
  ReadContext,
  StyleGroup,
} from "./ASTEditor";

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
  protected addLookupDataToAST({
    ast,
    codeEntry,
  }: {
    ast: t.File;
    codeEntry: CodeEntry;
  }) {
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
  protected removeLookupDataFromAST({ ast }: { ast: t.File }) {
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
    // todo only return if this is a string
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
    { ast, lookupId }: EditContext<t.File>,
    child: {
      tag: keyof HTMLElementTagNameMap | string;
      path?: string;
      isDefaultImport?: boolean;
      attributes?: Record<string, unknown>;
    }
  ) {
    let childTag = child.tag;
    // ensure the import for components with a path
    if (child.path) {
      childTag = this.getOrAddImport(ast, {
        name: childTag,
        path: child.path,
        isDefault: child.isDefaultImport,
      });
    }

    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      this.addJSXChildToJSXElement(
        path.value,
        childTag,
        {
          ...child.attributes,
          [`data-${JSX_RECENTLY_ADDED_DATA_ATTR}`]: JSX_RECENTLY_ADDED,
        },
        {
          isNewRoute: childTag === "Route",
        }
      );
    });
  }

  protected updateElementAttributesInAST(
    { ast, lookupId }: EditContext<t.File>,
    attributes: Record<string, unknown>
  ) {
    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      Object.entries(attributes).forEach(([key, value]) => {
        const { openingElement } = path.value;
        let attr = openingElement.attributes?.find(
          (attr): attr is t.JSXAttribute =>
            attr.type === "JSXAttribute" && attr.name.name === key
        );
        if (!attr) {
          openingElement.attributes = openingElement.attributes || [];
          attr = b.jsxAttribute(b.jsxIdentifier(key), valueToJSXLiteral({}));
          openingElement.attributes.push(attr);
        }

        attr.value = valueToJSXLiteral(value);
      });
    });
  }

  protected updateElementComponentInAST(
    { ast, lookupId }: EditContext<t.File>,
    component: string
  ) {
    // ensure the import for react-router-dom components
    if (component === "Route" || component === "Link") {
      component = this.getOrAddImport(ast, {
        path: "react-router-dom",
        name: component,
      });
    }

    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      path.value.openingElement.name = b.jsxIdentifier(component);
      if (path.value.closingElement) {
        path.value.closingElement.name = b.jsxIdentifier(component);
      }
    });
  }

  protected updateElementTextInAST(
    { ast, lookupId }: EditContext<t.File>,
    newTextContent: string
  ) {
    this.getJSXElementByLookupId(ast, lookupId, (path) => {
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
    { ast, codeEntry, lookupId }: EditContext<t.File>,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry
  ) {
    // get the import for the asset
    const relativeAssetPath = getRelativeImportPath(
      codeEntry,
      assetEntry.filePath
    );
    const assetDefaultName = `Asset${startCase(
      path.basename(assetEntry.filePath).replace(/\..*$/, "")
    ).replace(/\s+/g, "")}`;
    const assetIdentifier = this.getOrAddImport(ast, {
      path: relativeAssetPath,
      name: assetDefaultName,
      isDefault: true,
    });

    this.getJSXElementByLookupId(ast, lookupId, (path) => {
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

  public getRecentlyAddedElements({ ast, codeEntry }: ReadContext<t.File>) {
    let resultIndicies: number[] = [];
    // find all jsx elements with recently added data attributes
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
    // map those elements to lookup ids and return them
    return resultIndicies.map((index) => this.createLookupId(codeEntry, index));
  }

  public getElementLookupIdAtCodePosition(
    { ast, codeEntry }: ReadContext<t.File>,
    line: number,
    column: number
  ) {
    let resultId: number | undefined;
    let tokenCount: number | undefined;
    // find the smallest jsx element (by token count) that has the target code position
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
        resultId = index;
        tokenCount = (end.token || 0) - (start.token || 0);
      }
    });
    return resultId !== undefined
      ? this.createLookupId(codeEntry, resultId)
      : undefined;
  }

  public getSourceMetaDataFromLookupId(
    { ast }: ReadContext<t.File>,
    lookupId: string
  ) {
    let sourceMetadata: SourceMetadata | undefined;
    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      sourceMetadata = {
        // get the component name
        // todo handle more cases
        componentName:
          pipe(
            path.value.openingElement.name,
            ifJSXIdentifier,
            (_) => _?.name
          ) || "",
        // get the component props by best effort (won't match non literals)
        directProps:
          path.value.openingElement.attributes
            ?.map((attr) =>
              pipe(attr, ifJSXAttribute, (_) =>
                _
                  ? {
                      key: pipe(_.name, ifJSXIdentifier, (__) => __?.name),
                      value: _.value && jsxLiteralToValue(_.value),
                    }
                  : _
              )
            )
            .reduce((acc: Record<string, unknown>, cur) => {
              if (cur && cur.key !== undefined) acc[cur.key] = cur.value;
              return acc;
            }, {}) || {},
      };
    });
    return sourceMetadata;
  }

  public getHTMLElementByLookupId(document: Document, lookupId: string) {
    return (
      document.querySelector<HTMLElement>(
        `[data-${JSX_LOOKUP_DATA_ATTR}="${lookupId}"]`
      ) || undefined
    );
  }

  public getEditorDecorationsForElement(
    { ast }: ReadContext<t.File>,
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
    { ast, lookupId }: EditContext<t.File>,
    styles: Styles
  ) {
    this.getJSXElementByLookupId(ast, lookupId, (path) =>
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

  protected getJSXElementByLookupId(
    ast: t.File,
    lookupId: string,
    apply: (path: NodePath<types.namedTypes.JSXElement, t.JSXElement>) => void
  ) {
    let found = false;
    traverseJSXElements(ast, (path) => {
      const lookupMatches = path.value.openingElement.attributes?.find(
        (attr) =>
          ifJSXAttribute(attr)?.name.name === `data-${JSX_LOOKUP_DATA_ATTR}` &&
          pipe(attr, ifJSXAttribute, getValue, ifStringLiteral, getValue) ===
            lookupId
      );
      if (lookupMatches) {
        apply(path);
        found = true;
      }
      // keep traversing until the element is found
      return !found;
    });
    if (!found)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  protected addJSXChildToJSXElement(
    parentElement: t.JSXElement,
    childElementTag: keyof HTMLElementTagNameMap | string,
    childAttributes: Record<string, unknown> = {},
    childOptions?: {
      shouldBeSelfClosing?: boolean;
      // `Route` specific flag
      isNewRoute?: boolean;
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
    if (childOptions?.isNewRoute && typeof childAttributes.path === "string") {
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
      // add a div so the route can be added to
      // TODO: generalize this behavior
      child.children = [
        b.jsxElement(
          b.jsxOpeningElement(
            b.jsxIdentifier("div"),
            [
              b.jsxAttribute(
                b.jsxIdentifier("style"),
                valueToJSXLiteral({ display: "flex", height: "100%" })
              ),
            ],
            true
          )
        ),
      ];
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

    const importedName =
      assetImportIdentifier.local?.name ||
      (assetImportIdentifier.type === "ImportSpecifier" &&
        assetImportIdentifier.imported.name);
    if (importedName === false) {
      throw new Error("Failed to find import name");
    }
    return importedName;
  }
}
