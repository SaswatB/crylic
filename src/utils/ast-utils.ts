import { parse, print, types, visit } from "recast";
import { NodePath } from "ast-types/lib/node-path";
import {
  DIV_LOOKUP_DATA_ATTR,
  DIV_RECENTLY_ADDED_DATA_ATTR,
} from "./constants";
import { babelTsParser } from "./babel-ts";

const { format } = __non_webpack_require__(
  "prettier"
) as typeof import("prettier");
const { builders: b } = types;

const traverseJSXElements = (
  ast: any,
  visitor: (
    path: NodePath<types.namedTypes.JSXElement, any>,
    index: string
  ) => void
) => {
  let count = 0;
  visit(ast, {
    visitJSXElement(path) {
      visitor(path, `${count++}`);
      this.traverse(path);
    },
  });
};

export const addLookupDataAttrToJSXElements = (code: string) => {
  const ast = parse(code, {
    parser: babelTsParser,
  });
  traverseJSXElements(ast, (path, index) => {
    const attr = b.jsxAttribute(
      b.jsxIdentifier(`data-${DIV_LOOKUP_DATA_ATTR}`),
      b.stringLiteral(index)
    );
    path.value.openingElement.attributes.push(attr);
  });
  console.log("ast", ast);
  return print(ast).code;
};

/**
 * Removes lookup data attributes from code that already has them (previously processed by addLookupDataAttrToJSXElements)
 * Runs `editElement` on the JSXElement with a data lookup attribute set to `editLookupId`
 */
export const removeLookupDataAttrFromJSXElementsAndEditJSXElement = (
  code: string,
  editLookupId?: string,
  editElement?: (path: NodePath<types.namedTypes.JSXElement, any>) => void
) => {
  const ast = parse(code, { parser: babelTsParser });
  traverseJSXElements(ast, (path) => {
    if (
      editLookupId !== undefined &&
      path.value.openingElement.attributes.find(
        (attr: any) =>
          attr.name.name === `data-${DIV_LOOKUP_DATA_ATTR}` &&
          attr.value.value === editLookupId
      )
    ) {
      editElement?.(path);
    }
    path.value.openingElement.attributes = path.value.openingElement.attributes.filter(
      (attr: any) => attr.name.name !== `data-${DIV_LOOKUP_DATA_ATTR}`
    );
  });
  return format(print(ast).code, { parser: "babel" });
};

const valueToASTLiteral = (
  value: unknown
):
  | types.namedTypes.BigIntLiteral
  | types.namedTypes.BooleanLiteral
  | types.namedTypes.NumericLiteral
  | types.namedTypes.NullLiteral
  | types.namedTypes.ObjectExpression
  | types.namedTypes.StringLiteral => {
  switch (typeof value) {
    case "bigint":
      return b.bigIntLiteral(`${value}`);
    case "boolean":
      return b.booleanLiteral(value);
    case "number":
      return b.numericLiteral(value);
    case "object":
      if (value === null) return b.nullLiteral();
      return b.objectExpression(
        Object.entries(value).map(([key, entryValue]) =>
          b.objectProperty(b.identifier(key), valueToASTLiteral(entryValue))
        )
      );
    case "string":
      return b.stringLiteral(value);
    default:
      throw new Error("Unsupported value type");
  }
};

const valueToJSXLiteral = (value: unknown) => {
  // jsx allows string literals for property values
  if (typeof value === "string") return b.stringLiteral(value);
  // jsx treats properties without any value as true
  if (value === true) return null;
  // wrap everything else in an expression container
  return b.jsxExpressionContainer(valueToASTLiteral(value));
};

export const addJSXChildToJSXElement = (
  parentElement: any,
  childElementTag: string,
  childAttributes: Record<string, any> = {},
  childShouldBeSelfClosing = false
) => {
  parentElement.children.push(
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
    )
  );
  // if the parent was self closing, open it up
  if (parentElement.openingElement.selfClosing) {
    parentElement.closingElement = b.jsxClosingElement(
      b.jsxIdentifier(parentElement.openingElement.name.name)
    );
    parentElement.openingElement.selfClosing = false;
  }
};

export const removeRecentlyAddedDataAttrAndGetLookupId = (code: string) => {
  const ast = parse(code, {
    parser: babelTsParser,
  });
  let resultId;
  traverseJSXElements(ast, (path, index) => {
    if (
      path.value.openingElement.attributes.find(
        (attr: any) => attr.name.name === `data-${DIV_RECENTLY_ADDED_DATA_ATTR}`
      )
    ) {
      resultId = index;
      path.value.openingElement.attributes = path.value.openingElement.attributes.filter(
        (attr: any) => attr.name.name !== `data-${DIV_RECENTLY_ADDED_DATA_ATTR}`
      );
    }
  });
  return { code: print(ast).code, lookUpId: resultId };
};

export const getASTByLookupId = (code: string, lookUpId: string) => {
  const ast = parse(code, {
    parser: babelTsParser,
  });
  let result: NodePath<types.namedTypes.JSXElement, any> | undefined;
  traverseJSXElements(ast, (path, index) => {
    if (index === lookUpId) {
      result = path;
    }
  });
  return result;
};

export const getJSXElementForSourceCodePosition = (
  code: string,
  line: number,
  column: number
) => {
  const ast = parse(code, {
    parser: babelTsParser,
  });
  let result: NodePath<types.namedTypes.JSXElement, any> | undefined;
  let resultId: string | undefined;
  let tokenCount: number | undefined;
  traverseJSXElements(ast, (path, index) => {
    const { start, end } = path?.value?.loc || {};
    if (
      start &&
      end &&
      (line > start.line || (line === start.line && column >= start.column)) &&
      (line < end.line || (line === end.line && column <= end.column)) &&
      (tokenCount === undefined || tokenCount > (end.token - start.token))
    ) {
      result = path;
      resultId = index;
      tokenCount = end.token - start.token;
    }
  });
  return { path: result, lookUpId: resultId };
};

export const applyStyleAttribute = (
  path: NodePath<types.namedTypes.JSXElement, any>,
  style: object
) => {
  const existingStyleAttr = path.value.openingElement.attributes.find(
    (attr: any) => attr.name.name === `style`
  );
  if (!existingStyleAttr) {
    path.value.openingElement.attributes.push(
      b.jsxAttribute(b.jsxIdentifier("style"), valueToJSXLiteral(style))
    );
    return;
  }
  Object.entries(style).forEach(([styleName, styleValue]) => {
    const existingStyleProp = existingStyleAttr.value.expression.properties.find(
      (prop: any) => prop.key.name === styleName
    );
    if (!existingStyleProp) {
      existingStyleAttr.value.expression.properties.push(
        b.objectProperty(b.identifier(styleName), valueToASTLiteral(styleValue))
      );
      return;
    }
    existingStyleProp.value = valueToASTLiteral(styleValue);
  });
};
