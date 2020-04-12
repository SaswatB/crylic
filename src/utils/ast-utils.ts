import { parse, print, types, visit } from "recast";
import { NodePath } from "ast-types/lib/node-path";
import { kebabCase } from 'lodash';
import {
  JSX_LOOKUP_DATA_ATTR,
  JSX_RECENTLY_ADDED_DATA_ATTR,
  STYLED_LOOKUP_CSS_VAR_PREFIX,
} from "./constants";
import { babelTsParser } from "./babel-ts";

const { format } = __non_webpack_require__(
  "prettier"
) as typeof import("prettier");
const { builders: b } = types;

const traverseStyledTemplatesElements = (
  ast: any,
  visitor: (
    path: NodePath<types.namedTypes.TaggedTemplateExpression, any>,
    index: string
  ) => void
) => {
  let count = 0;
  visit(ast, {
    visitTaggedTemplateExpression(path) {
      // todo use better static analysis than this for styled components support
      if (path.value?.tag?.object?.name === 'styled') {
        visitor(path, `${count++}`);
      }
      this.traverse(path);
    }
  });
};

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

export interface AddLookupDataResult {
  transformedCode: string;
  jsxElementLookupIds: string[];
  styledElementLookupIds: string[];
}

export const addLookupData = (code: string): AddLookupDataResult => {
  const ast = parse(code, {
    parser: babelTsParser,
  });
  let jsxElementLookupIds: string[] = [];
  traverseJSXElements(ast, (path, index) => {
    const attr = b.jsxAttribute(
      b.jsxIdentifier(`data-${JSX_LOOKUP_DATA_ATTR}`),
      b.stringLiteral(index)
    );
    path.value.openingElement.attributes.push(attr);
    jsxElementLookupIds.push(index)
  });
  let styledElementLookupIds: string[] = [];
  traverseStyledTemplatesElements(ast, (path, index) => {
    path.value.quasi.quasis[0].value.raw = `${STYLED_LOOKUP_CSS_VAR_PREFIX}${index}: 1;${path.value.quasi.quasis[0].value.raw}`;
    styledElementLookupIds.push(index);
  });
  console.log("ast", ast);
  return {
    transformedCode: print(ast).code,
    jsxElementLookupIds,
    styledElementLookupIds,
  };
};

/**
 * Removes lookup data attributes from code that already has them (previously processed by addLookupData)
 * Runs `editJSXElement` on the JSXElement with a data lookup attribute set to `editJSXLookupId`
 * Runs `editStyledTemplate` on the TaggedTemplateExpression with a data lookup attribute set to `editStyledLookupId`
 */
export const removeLookupDataAndEditByLookup = (
  code: string,
  editJSXLookupId?: string,
  editJSXElement?: (path: NodePath<types.namedTypes.JSXElement, any>) => void,
  editStyledLookupId?: string,
  editStyledTemplate?: (path: NodePath<types.namedTypes.TaggedTemplateExpression, any>) => void,
) => {
  const ast = parse(code, { parser: babelTsParser });
  traverseJSXElements(ast, (path) => {
    if (
      editJSXLookupId !== undefined &&
      path.value.openingElement.attributes.find(
        (attr: any) =>
          attr.name.name === `data-${JSX_LOOKUP_DATA_ATTR}` &&
          attr.value.value === editJSXLookupId
      )
    ) {
      editJSXElement?.(path);
    }
    path.value.openingElement.attributes = path.value.openingElement.attributes.filter(
      (attr: any) => attr.name.name !== `data-${JSX_LOOKUP_DATA_ATTR}`
    );
  });
  traverseStyledTemplatesElements(ast, (path) => {
    const lookupMatcher = new RegExp(`${STYLED_LOOKUP_CSS_VAR_PREFIX}(\\d+): 1;`);
    const res = lookupMatcher.exec(path.value.quasi.quasis[0].value.raw)
    if (res) {
      path.value.quasi.quasis[0].value.raw = path.value.quasi.quasis[0].value.raw.replace(res[0], '');
      if (editStyledLookupId !== undefined && res[1] === editStyledLookupId) {
        editStyledTemplate?.(path);
      }
    }
  });
  return format(print(ast).code, { parser: "babel-ts" });
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
        (attr: any) => attr.name.name === `data-${JSX_RECENTLY_ADDED_DATA_ATTR}`
      )
    ) {
      resultId = index;
      path.value.openingElement.attributes = path.value.openingElement.attributes.filter(
        (attr: any) => attr.name.name !== `data-${JSX_RECENTLY_ADDED_DATA_ATTR}`
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

export const applyJSXInlineStyleAttribute = (
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


export const applyStyledStyleAttribute = (
  path: NodePath<types.namedTypes.TaggedTemplateExpression, any>,
  style: object
) => {
  Object.entries(style).forEach(([styleName, styleValue]) => {
    const cssStyleName = kebabCase(styleName);
    const styleMatcher = new RegExp(`($|\\s)\\s*${cssStyleName}: ([^:;]+);`);
    const found = path.value.quasi.quasis.find(({value: quasiValue}: any) => {
      const res = styleMatcher.exec(quasiValue.raw);
      if (res) {
        quasiValue.raw = quasiValue.raw.replace(styleMatcher, `${cssStyleName}: ${styleValue};`);
        return true;
      }
      return false;
    });
    if (found) return;

    // add rule to the end of the template
    const quasiValue = path.value.quasi.quasis[path.value.quasi.quasis.length-1].value;
    quasiValue.raw = `${quasiValue.raw}${cssStyleName}: ${styleValue};`;
  });
};
