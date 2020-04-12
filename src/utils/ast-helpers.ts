import { parse, print, types, visit } from "recast";
import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { LiteralKind } from "ast-types/gen/kinds";
import { produce } from "immer";
import { babelTsParser } from "./babel-ts";

const { format } = __non_webpack_require__(
  "prettier"
) as typeof import("prettier");

const { builders: b } = types;

export const parseAST = (code: string): t.File =>
  parse(code, {
    parser: babelTsParser,
  });
export const printAST = (ast: t.File) => print(ast).code;
export const prettyPrintAST = (ast: t.File) =>
  format(printAST(ast), { parser: "babel-ts" });

export const ifIdentifier = (
  node: t.Node | null | undefined
): t.Identifier | undefined =>
  node?.type === "Identifier" ? (node as t.Identifier) : undefined;
export const ifObjectExpression = (
  node: t.Node | null | undefined
): t.ObjectExpression | undefined =>
  node?.type === "ObjectExpression" ? (node as t.ObjectExpression) : undefined;
export const ifObjectProperty = (
  node: t.Node | null | undefined
): t.ObjectProperty | undefined =>
  node?.type === "ObjectProperty" ? (node as t.ObjectProperty) : undefined;
export const ifJSXAttribute = (
  node: t.Node | null | undefined
): t.JSXAttribute | undefined =>
  node?.type === "JSXAttribute" ? (node as t.JSXAttribute) : undefined;
export const ifJSXExpressionContainer = (
  node: t.Node | null | undefined
): t.JSXExpressionContainer | undefined =>
  node?.type === "JSXExpressionContainer"
    ? (node as t.JSXExpressionContainer)
    : undefined;
export const ifStringLiteral = (
  node: t.Node | null | undefined
): t.StringLiteral | undefined =>
  node?.type === "StringLiteral" ? (node as t.StringLiteral) : undefined;

export const getValue = <S, T extends { value?: S }>(
  node: T | null | undefined
): S | undefined => node?.value;

export const valueToASTLiteral = (
  value: unknown
):
  | LiteralKind
  | t.ObjectExpression => {
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
    case "undefined":
      return b.literal('undefined');
    default:
      throw new Error(`Unsupported value type ${typeof value}`);
  }
};

export const valueToJSXLiteral = (value: unknown) => {
  // jsx allows string literals for property values
  if (typeof value === "string") return b.stringLiteral(value);
  // jsx treats properties without any value as true
  if (value === true) return null;
  // wrap everything else in an expression container
  return b.jsxExpressionContainer(valueToASTLiteral(value));
};

export const traverseStyledTemplatesElements = (
  ast: t.File,
  visitor: (
    path: NodePath<
      types.namedTypes.TaggedTemplateExpression,
      t.TaggedTemplateExpression
    >,
    index: string
  ) => void
) => {
  let count = 0;
  visit(ast, {
    visitTaggedTemplateExpression(path) {
      // todo use better static analysis than this for styled components support
      if (path.value?.tag?.object?.name === "styled") {
        visitor(path, `${count++}`);
      }
      this.traverse(path);
    },
  });
};

export const traverseJSXElements = (
  ast: t.File,
  visitor: (
    path: NodePath<types.namedTypes.JSXElement, t.JSXElement>,
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

export const editAST = <T extends object | void, U extends any[]>(
  apply: (ast: t.File, ...rest: U) => T
) => (ast: t.File, ...rest: U): T extends void ? t.File : T & {ast: t.File} => {
  let applyResult: T | undefined = undefined;
  const newAst = produce(ast, (draft) => {
    applyResult = apply(draft, ...rest)
  });
  if (applyResult) {
    return {
      // @ts-ignore ts bug
      ...applyResult,
      ast,
    }
  }
  // @ts-ignore ts bug
  return newAst;
}
