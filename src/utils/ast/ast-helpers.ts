import { namedTypes as t } from "ast-types";
import { LiteralKind } from "ast-types/gen/kinds";
import { NodePath } from "ast-types/lib/node-path";
import deepFreeze from "deep-freeze-strict";
import { Either, left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import gonzales, {
  createNode,
  CSSASTNode,
  CSSASTNodeType,
  CSSASTSyntax,
} from "gonzales-pe";
import { cloneDeep, isArray } from "lodash";
import prettierParserBabel from "prettier/parser-babel";
import prettierParsesPostcss from "prettier/parser-postcss";
import { format } from "prettier/standalone";
import { parse, print, types, visit } from "recast";

import { CodeEntry } from "../../types/paint";
import { getStyleEntryExtension, isStyleEntry } from "../utils";
import { babelTsParser } from "./babel-ts";

const { builders: b } = types;

export const parseAST = (code: string): t.File =>
  parse(code, {
    parser: babelTsParser,
  });
export const printAST = (ast: t.File) => print(cloneDeep(ast)).code;
export const prettyPrintAST = (ast: t.File) =>
  format(printAST(ast), { parser: "babel-ts", plugins: [prettierParserBabel] });

export const parseStyleSheetAST = (codeEntry: CodeEntry) => {
  const syntax = getStyleEntryExtension(codeEntry);
  const ast = gonzales.parse(codeEntry.code || "", {
    syntax,
  });
  // fill in a default syntax if the ast has none (which can happen for empty files)
  ast.syntax = ast.syntax || syntax;
  return ast;
};
export const printStyleSheetAST = (ast: CSSASTNode) => ast.toString();
export const prettyPrintStyleSheetAST = (
  codeEntry: CodeEntry,
  ast: CSSASTNode
) => {
  const syntax = getStyleEntryExtension(codeEntry);
  const code = printStyleSheetAST(ast);

  // prettier doesn't support sass https://github.com/prettier/prettier/issues/4948
  if (syntax === "sass") {
    return code;
  }

  return format(code, { parser: syntax, plugins: [prettierParsesPostcss] });
};

export const parseCodeEntryAST = (codeEntry: CodeEntry) =>
  isStyleEntry(codeEntry)
    ? parseStyleSheetAST(codeEntry)
    : parseAST(codeEntry.code || "");
export const printCodeEntryAST = (
  codeEntry: CodeEntry,
  ast: CSSASTNode | t.File
) =>
  isStyleEntry(codeEntry)
    ? printStyleSheetAST(ast as CSSASTNode)
    : printAST(ast as t.File);
export const prettyPrintCodeEntryAST = (
  codeEntry: CodeEntry,
  ast: CSSASTNode | t.File
) =>
  isStyleEntry(codeEntry)
    ? prettyPrintStyleSheetAST(codeEntry, ast as CSSASTNode)
    : prettyPrintAST(ast as t.File);

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
export const ifJSXElement = (
  node: t.Node | null | undefined
): t.JSXElement | undefined =>
  node?.type === "JSXElement" ? (node as t.JSXElement) : undefined;
export const ifJSXExpressionContainer = (
  node: t.Node | null | undefined
): t.JSXExpressionContainer | undefined =>
  node?.type === "JSXExpressionContainer"
    ? (node as t.JSXExpressionContainer)
    : undefined;
export const ifJSXIdentifier = (
  node: t.Node | null | undefined
): t.JSXIdentifier | undefined =>
  node?.type === "JSXIdentifier" ? (node as t.JSXIdentifier) : undefined;
export const ifJSXText = (
  node: t.Node | null | undefined
): t.JSXText | undefined =>
  node?.type === "JSXText" ? (node as t.JSXText) : undefined;
export const ifStringLiteral = (
  node: t.Node | null | undefined
): t.StringLiteral | undefined =>
  node?.type === "StringLiteral" ? (node as t.StringLiteral) : undefined;
export const ifVariableDeclarator = (
  node: t.Node | null | undefined
): t.VariableDeclarator | undefined =>
  node?.type === "VariableDeclarator"
    ? (node as t.VariableDeclarator)
    : undefined;

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

export const getIdName = <T extends { id?: t.Node | null }>(
  node: T | null | undefined
): string | undefined => pipe(node?.id, ifIdentifier, (_) => _?.name);

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

const LiteralKindTypes = [
  "BigIntLiteral",
  "BooleanLiteral",
  "JSXText",
  "Literal",
  "NullLiteral",
  "NumericLiteral",
  "RegExpLiteral",
  "StringLiteral",
];

export const astLiteralToValue = (value: LiteralKind | t.ObjectExpression) => {
  if (LiteralKindTypes.includes(value.type)) {
    return (value as LiteralKind).value;
  } else if (value.type === "ObjectExpression") {
    return value.properties
      .map((prop) => {
        if (prop.type === "ObjectProperty") {
          if (LiteralKindTypes.includes(prop.value.type)) {
            return {
              key: pipe(prop.key, ifStringLiteral, getValue),
              value: (prop.value as LiteralKind).value,
            };
          }
        }
        return undefined;
      })
      .filter((e) => e && e.key !== undefined)
      .reduce((acc: Record<string, unknown>, cur) => {
        acc[cur!.key!] = cur!.value;
        return acc;
      }, {});
  }
  throw new Error(`Unexpected value type ${value.type}`);
};

export const valueToJSXLiteral = (value: unknown) => {
  // jsx allows string literals for property values
  if (typeof value === "string") return b.stringLiteral(value);
  // jsx treats properties without any value as true
  if (value === true) return null;
  // wrap everything else in an expression container
  return b.jsxExpressionContainer(valueToASTLiteral(value));
};

export const jsxLiteralToValue = (
  value: LiteralKind | t.JSXExpressionContainer
) => {
  if (value.type === "JSXExpressionContainer") {
    if (value.expression.type === "ObjectExpression") {
      return astLiteralToValue(value.expression);
    }
    // todo process more types of expressions
    return undefined;
  }
  return astLiteralToValue(value);
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
  ) => boolean | void
) => {
  let count = 0;
  visit(ast, {
    visitJSXElement(path) {
      const result = visitor(path, count++);
      if (result === false) return false;
      this.traverse(path);
    },
  });
};

const getBlockIdentifiers = (nodes: t.ASTNode[], parents: t.ASTNode[] = []) => {
  const identifiers: {
    name: string;
    node: t.ASTNode;
    parents: t.ASTNode[];
  }[] = [];
  nodes.forEach((node) => {
    const newParents = [...parents, node];
    // todo cover more cases
    switch (node.type) {
      case "Program":
        identifiers.push(...getBlockIdentifiers(node.body, newParents));
        break;
      case "ImportDeclaration":
        identifiers.push(
          ...getBlockIdentifiers(node.specifiers || [], newParents)
        );
        break;
      case "ExportDefaultDeclaration":
      case "ExportNamedDeclaration":
        if (node.declaration) {
          identifiers.push(
            ...getBlockIdentifiers([node.declaration], newParents)
          );
        }
        break;
      case "VariableDeclaration":
        identifiers.push(...getBlockIdentifiers(node.declarations, newParents));
        break;
      case "VariableDeclarator":
      case "FunctionDeclaration":
        identifiers.push(...getBlockIdentifiers([node.id], newParents));
        break;

      case "Identifier":
        identifiers.push({ name: node.name, node, parents });
        break;
    }
  });
  return identifiers;
};

export const getComponentExport = (
  ast: t.File
):
  | { isDefault: true; name?: undefined }
  | { isDefault: false; name: string }
  | undefined => {
  // get all export nodes at the top level of the program
  const exportNodes = ast.program.body.filter((node) => {
    switch (node.type) {
      case "ExportAllDeclaration":
      case "ExportDefaultDeclaration":
      case "ExportNamedDeclaration":
      case "ExportDeclaration":
        return true;
      default:
        return false;
    }
  }) as (
    | t.ExportAllDeclaration
    | t.ExportDefaultDeclaration
    | t.ExportNamedDeclaration
    | t.ExportDeclaration
  )[];

  // todo cover more cases from https://developer.mozilla.org/en-US/docs/web/javascript/reference/statements/export
  // todo support marker comment that overrides static analysis
  // todo try to check if the function returns jsx
  // todo try to get the best export if multiple functions are defined

  /**
   * Checks whether the given variable name refers to a function
   */
  const hasFunctionIdentifier = (varName: string) => {
    // get all the variables defined at the top level of the program
    const astIdentifiers = getBlockIdentifiers([ast.program]); // todo cache after first run & filter out ones past the target line

    // get the identifier for the given variable
    const varIdentifier = astIdentifiers.find((ai) => ai.name === varName);
    if (!varIdentifier) return false;

    // get the identifier parent
    const varParent = varIdentifier.parents[varIdentifier.parents.length - 1];

    // check whether the parent is a function (not exhaustive)
    return (
      varParent.type === "FunctionDeclaration" ||
      (varParent.type === "VariableDeclarator" &&
        (varParent.init?.type === "ArrowFunctionExpression" ||
          varParent.init?.type === "FunctionExpression"))
    );
  };

  const exportedFunctions = exportNodes
    .filter(
      (node): node is t.ExportNamedDeclaration | t.ExportDefaultDeclaration =>
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
    )
    .map((node) => {
      let name: string | undefined;
      switch (node.declaration?.type) {
        case "FunctionDeclaration": {
          if (node.type === "ExportDefaultDeclaration") {
            // name doesn't matter (and may not exist) for default export
            return { node };
          }
          name = getIdName(node.declaration);
          break;
        }
        case "VariableDeclaration": {
          // search all variable declarations for function definitions
          name = node.declaration.declarations
            .map((declaration) => {
              if (declaration.type !== "VariableDeclarator") return undefined;
              if (
                declaration.init?.type !== "ArrowFunctionExpression" &&
                declaration.init?.type !== "FunctionExpression"
              )
                return undefined;

              const declarationName = getIdName(declaration);
              return declarationName;
            })
            .filter((n) => n !== undefined)[0];
          break;
        }
        case "ArrowFunctionExpression":
        case "FunctionExpression":
          if (node.type === "ExportDefaultDeclaration") {
            // these declarations should only be possible for default exports
            return { node };
          }
          break;
        case "Identifier":
          // if a default export is exporting a variable, check if that variable is a function (this is handled under specifiers for named exports)
          if (
            node.type === "ExportDefaultDeclaration" &&
            hasFunctionIdentifier(node.declaration.name)
          ) {
            return { node };
          }
          break;
      }
      if (node.type === "ExportNamedDeclaration") {
        // check whether any specifiers are functions
        name =
          node.specifiers?.map((specifier) => {
            const varName =
              getIdName({ id: specifier.local }) ||
              getIdName({ id: specifier.exported });
            return varName && hasFunctionIdentifier(varName)
              ? varName
              : undefined;
          })[0] || name;
      }
      return name ? { name, node } : undefined;
    })
    .filter((n) => n !== undefined);

  // return whether an export was found
  if (exportedFunctions.length > 0) {
    if (exportedFunctions[0]!.node.type === "ExportDefaultDeclaration") {
      return { isDefault: true };
    }
    return { isDefault: false, name: exportedFunctions[0]!.name! };
  }

  return undefined;
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

export const editAST = <R, S, T extends object | void, U extends any[]>(
  apply: (arg0: S & { ast: R }, ...rest: U) => T
) => (
  arg0: S & { ast: R },
  ...rest: U
): T extends void ? R : T & { ast: R } => {
  let applyResult: T | undefined = undefined;
  const newAst = cloneDeep(arg0.ast);
  // const newAst = produce(ast, (draft) => {
  //   console.log('using draft')
  applyResult = apply({ ...arg0, ast: newAst }, ...rest);
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

// convenience builder wrapper over createNode
export const CSSASTBuilder: {
  [index in CSSASTNodeType]: (content: CSSASTNode["content"]) => CSSASTNode;
} = new Proxy({} as any, {
  get(target, type) {
    return (content: CSSASTNode["content"]) =>
      createNode({ type: type as CSSASTNodeType, content });
  },
});
const cb = CSSASTBuilder;

export function createCSSPropertyDeclaration(
  name: string,
  value: string,
  indentation: string,
  syntax: CSSASTSyntax
) {
  const nodes = [
    cb.space(indentation),
    cb.declaration([
      cb.property([cb.ident(name)]),
      cb.propertyDelimiter(":"),
      cb.space(" "),
      cb.value([cb.ident(value)]),
    ]),
  ];
  if (syntax !== "sass") {
    nodes.push(cb.declarationDelimiter(";"));
  }
  nodes.push(cb.space("\n"));
  return nodes;
}

export function eitherContent({
  content,
}: CSSASTNode): Either<string, CSSASTNode[]> {
  if (ifArray(content)) {
    return right(content as CSSASTNode[]);
  }
  return left(content as string);
}
