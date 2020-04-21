import { namedTypes as t } from "ast-types";
import { LiteralKind } from "ast-types/gen/kinds";
import { NodePath } from "ast-types/lib/node-path";
import deepFreeze from "deep-freeze-strict";
import { CSSASTNode } from "gonzales-pe";
import { cloneDeep, isArray } from "lodash";
import { parse, print, types, visit } from "recast";

import { babelTsParser } from "./babel-ts";

const { format } = __non_webpack_require__(
  "prettier"
) as typeof import("prettier");

const { builders: b } = types;

export const parseAST = (code: string): t.File =>
  parse(code, {
    parser: babelTsParser,
  });
export const printAST = (ast: t.File) => print(cloneDeep(ast)).code;
export const prettyPrintAST = (ast: t.File) =>
  format(printAST(ast), { parser: "babel-ts" });
export const prettyPrintStyleSheetAST = (ast: CSSASTNode) =>
  format(ast.toString(), { parser: "css" });

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

export const ifString = (value: unknown) =>
  typeof value === "string" ? value : undefined;
export const ifArray = <T, U>(value: T[] | U) =>
  isArray(value) ? (value as T[]) : undefined;

type ExtractPropType<T, U extends string> = T extends { [index in U]?: infer S }
  ? S
  : never;

export const getValue = <S, T extends { value?: S }>(
  node: T | null | undefined
): ExtractPropType<T, "value"> | undefined => node?.value as any;

export const getContent = <S, T extends { content?: S }>(
  node: T | null | undefined
): ExtractPropType<T, "content"> | undefined => node?.content as any;

export const valueToASTLiteral = (
  value: unknown
): LiteralKind | t.ObjectExpression => {
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
      return b.literal("undefined");
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

export const copyJSXName = (
  name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName
) => {
  switch (name.type) {
    case "JSXIdentifier":
      return b.jsxIdentifier.from(name);
    case "JSXMemberExpression":
      return b.jsxMemberExpression.from(name);
    case "JSXNamespacedName":
      return b.jsxNamespacedName.from(name);
    default:
      throw new Error(`Unknown jsx name type "${(name as any).type}"`);
  }
};

export const traverseStyledTemplatesElements = (
  ast: t.File,
  visitor: (
    path: NodePath<
      types.namedTypes.TaggedTemplateExpression,
      t.TaggedTemplateExpression
    >,
    index: number
  ) => void
) => {
  let count = 0;
  visit(ast, {
    visitTaggedTemplateExpression(path) {
      // todo use better static analysis than this for styled components support
      if (path.value?.tag?.object?.name === "styled") {
        visitor(path, count++);
      }
      this.traverse(path);
    },
  });
};

export const traverseJSXElements = (
  ast: t.File,
  visitor: (
    path: NodePath<types.namedTypes.JSXElement, t.JSXElement>,
    index: number
  ) => void
) => {
  let count = 0;
  visit(ast, {
    visitJSXElement(path) {
      visitor(path, count++);
      this.traverse(path);
    },
  });
};

export const traverseStyleSheetRuleSets = (
  ast: CSSASTNode,
  visitor: (path: CSSASTNode, index: number) => void
) => {
  let count = 0;
  ast.traverseByType("ruleset", (path: CSSASTNode) => {
    visitor(path, count++);
  });
};

export const editAST = <S, T extends object | void, U extends any[]>(
  apply: (ast: S, ...rest: U) => T
) => (ast: S, ...rest: U): T extends void ? S : T & { ast: S } => {
  let applyResult: T | undefined = undefined;
  const newAst = cloneDeep(ast);
  // const newAst = produce(ast, (draft) => {
  //   console.log('using draft')
  applyResult = apply(newAst, ...rest);
  //   console.log('finished draft')
  // });
  if (applyResult) {
    // @ts-ignore ts bug
    return {
      ...applyResult,
      ast: deepFreeze(newAst),
    };
  }
  // @ts-ignore ts bug
  return deepFreeze(newAst);
};

export function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    let chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash.toString(16).replace("-", "");
}

export function registerUninheritedCSSProperty(
  iframe: HTMLIFrameElement,
  property: string
) {
  try {
    // @ts-ignore ignore new api missing types
    iframe.contentWindow!.CSS.registerProperty({
      name: property,
      inherits: false,
    });
  } catch (e) {}
}