import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { omit, startCase } from "lodash";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import path from "path";
import { types } from "recast";

import {
  ComponentDefinition,
  CustomComponentDefinition,
  SourceMetadata,
  StyleKeys,
  Styles,
} from "../../../types/paint";
import { CodeEntry } from "../../project/CodeEntry";
import {
  copyJSXName,
  eitherIf,
  getName,
  getValue,
  ifIdentifier,
  ifJSXAttribute,
  ifJSXElement,
  ifJSXExpressionContainer,
  ifJSXIdentifier,
  ifJSXMemberExpression,
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
      // todo get 'React' from import
      const isReactFragment = pipe(
        path.value.openingElement.name,
        (_) => (_.type === "JSXMemberExpression" ? _ : undefined),
        (_) =>
          _?.object.type === "JSXIdentifier" &&
          _.object.name === "React" &&
          _?.property.name === "Fragment"
      );
      // don't add lookup ids to react fragments, otherwise react complains
      if (!isReactFragment) {
        const attr = b.jsxAttribute(
          b.jsxIdentifier(`data-${JSX_LOOKUP_DATA_ATTR}`),
          b.stringLiteral(lookupId)
        );
        path.value.openingElement.attributes?.push(attr);
      }
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

  public getCodeLineFromLookupId(
    { ast }: ReadContext<t.File>,
    lookupId: string
  ) {
    let line;
    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      line = path.node.loc?.start.line;
    });
    return line;
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
    { ast, codeEntry, lookupId }: EditContext<t.File>,
    child: ComponentDefinition
  ) {
    const childTag = this.getOrImportComponent(ast, codeEntry, child);

    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      this.addJSXChildToJSXElement(
        path.value,
        childTag,
        {
          ...child.attributes,
          [`data-${JSX_RECENTLY_ADDED_DATA_ATTR}`]: JSX_RECENTLY_ADDED,
        },
        {
          isNewRoute: ifJSXIdentifier(childTag)?.name === "Route",
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
    { ast, codeEntry, lookupId }: EditContext<t.File>,
    componentDef: ComponentDefinition
  ) {
    const componentTag = this.getOrImportComponent(
      ast,
      codeEntry,
      componentDef
    );

    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      path.value.openingElement.name = componentTag;
      if (path.value.closingElement) {
        path.value.closingElement.name = componentTag;
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
    const relativeAssetPath = codeEntry.getRelativeImportPath(
      assetEntry.filePath
    );
    const assetDefaultName = `Asset${startCase(
      path.basename(assetEntry.filePath).replace(/\..*$/, "")
    ).replace(/\s+/g, "")}`;
    const assetIdentifier = this.getOrAddImport(ast, codeEntry, {
      name: assetDefaultName,
      import: {
        path: relativeAssetPath,
        isDefault: true,
      },
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
            // todo do this more safely
            [b.identifier(ifJSXIdentifier(assetIdentifier)!.name)]
          ),
        },
      ]);
    });
  }

  protected deleteElementInAST({ ast, lookupId }: EditContext<t.File>): void {
    this.getJSXElementByLookupId(ast, lookupId, (path) => {
      const parent = ifJSXElement(path.parent?.value);
      // refuse to delete the element if its parent isn't also a JSX element
      if (!parent)
        throw new Error("Structure is too complex to delete element");

      parent.children = parent.children?.filter((c) => c !== path.value);
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
            eitherIf(ifJSXIdentifier),
            fold(getName, (a) =>
              pipe(
                a,
                ifJSXMemberExpression,
                (_) => ({
                  object: pipe(_?.object, ifJSXIdentifier, getName),
                  property: pipe(_?.property, ifJSXIdentifier, getName),
                }),
                (_) =>
                  _.object && _.property
                    ? `${_.object}.${_.property}`
                    : undefined
              )
            )
          ) || "",
        // get the component props by best effort (won't match non literals)
        directProps:
          path.value.openingElement.attributes
            ?.map((attr) =>
              pipe(attr, ifJSXAttribute, (_) =>
                _
                  ? {
                      key: pipe(_.name, ifJSXIdentifier, getName),
                      value:
                        _.value &&
                        // todo investigate how this is possible https://github.com/benjamn/ast-types/pull/375
                        _.value?.type !== "JSXElement" &&
                        _.value?.type !== "JSXFragment"
                          ? jsxLiteralToValue(_.value)
                          : undefined,
                    }
                  : undefined
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

  public getHTMLElementsByLookupId(document: Document, lookupId: string) {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        `[data-${JSX_LOOKUP_DATA_ATTR}="${lookupId}"]`
      )
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

  protected applyStylesToAST(
    { ast, lookupId }: EditContext<t.File>,
    styles: Styles
  ) {
    this.getJSXElementByLookupId(ast, lookupId, (path) =>
      this.applyJSXInlineStyleAttribute(
        path,
        Object.entries(styles).map(([styleName, styleValue]) => ({
          styleName: styleName as StyleKeys,
          styleValue: styleValue !== null ? b.stringLiteral(styleValue) : null,
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
    childElementTag: t.JSXIdentifier | t.JSXMemberExpression,
    childAttributes: Record<string, unknown> = {},
    childOptions?: {
      shouldBeSelfClosing?: boolean;
      // `Route` specific flag
      isNewRoute?: boolean;
    }
  ) {
    // add a text attribute as a child
    const grandChildren =
      "textContent" in childAttributes
        ? [b.jsxText(childAttributes.textContent as string)]
        : [];
    const selfClosing =
      grandChildren.length === 0 &&
      (childOptions?.shouldBeSelfClosing ?? false);

    const child = b.jsxElement(
      b.jsxOpeningElement(
        childElementTag,
        Object.entries(
          omit(childAttributes, "textContent")
        ).map(([name, value]) =>
          b.jsxAttribute(b.jsxIdentifier(name), valueToJSXLiteral(value))
        ),
        selfClosing
      ),
      selfClosing ? undefined : b.jsxClosingElement(childElementTag),
      grandChildren
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
                valueToJSXLiteral({
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                })
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
      styleName: StyleKeys;
      styleValue: t.StringLiteral | t.TemplateLiteral | null;
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
      const existingStyleLiteral = pipe(
        existingStyleAttr,
        ifJSXAttribute,
        getValue,
        ifJSXExpressionContainer,
        (_) => _?.expression,
        ifObjectExpression
      );
      const existingStyleProp = pipe(
        existingStyleLiteral,
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
        if (styleValue === null) {
          // if the style is set to null, delete the attribute
          existingStyleLiteral!.properties = existingStyleLiteral!.properties.filter(
            (prop) => prop !== existingStyleProp
          );
        } else {
          existingStyleProp.value = styleValue;
        }
        return;
      } else if (styleValue === null) {
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

  protected getOrImportComponent(
    ast: t.File,
    codeEntry: CodeEntry,
    componentDef: ComponentDefinition
  ) {
    if (componentDef.isHTMLElement) {
      return b.jsxIdentifier(componentDef.tag);
      // todo should this import React?
    } else {
      // ensure the import for components with a path
      return this.getOrAddImport(ast, codeEntry, componentDef.component);
    }
  }

  protected getOrAddImport(
    ast: t.File,
    codeEntry: CodeEntry,
    component: CustomComponentDefinition
  ) {
    const importPath = codeEntry.getRelativeImportPath(component.import.path);
    const importName =
      component.import.namespace || component.import.name || component.name;

    // try to find an existing import declaration
    let assetImport = ast.program.body.find(
      (node): node is t.ImportDeclaration =>
        node.type === "ImportDeclaration" &&
        node.source.type === "StringLiteral" &&
        node.source.value === importPath
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
        b.stringLiteral(importPath)
      );
      ast.program.body.splice(lastImportIndex, 0, assetImport);
    }
    // try to find a default export on the import declaration
    let assetImportIdentifier = assetImport!.specifiers?.find((node): node is
      | t.ImportDefaultSpecifier
      | t.ImportSpecifier =>
      component.import.isDefault
        ? node.type === "ImportDefaultSpecifier"
        : node.type === "ImportSpecifier" && node.imported.name === importName
    );
    // add a default import if none is found
    if (!assetImportIdentifier) {
      assetImportIdentifier = component.import.isDefault
        ? b.importDefaultSpecifier(
            b.identifier(component.import.preferredAlias || importName)
          )
        : // todo add local if there's a name conflict
          b.importSpecifier(
            b.identifier(importName),
            component.import.preferredAlias
              ? b.identifier(component.import.preferredAlias)
              : null
          );
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
    if (component.import.namespace) {
      return b.jsxMemberExpression(
        b.jsxIdentifier(importedName),
        b.jsxIdentifier(component.import.name || component.name)
      );
    }
    return b.jsxIdentifier(importedName);
  }
}
