import { namedTypes as t } from "ast-types";
import { ExpressionKind, LiteralKind } from "ast-types/gen/kinds";
import { NodePath } from "ast-types/lib/node-path";
import clone from "clone";
import deepFreeze from "deep-freeze-strict";
import { Either, fold, left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import gonzales, {
  createNode,
  CSSASTNode,
  CSSASTNodeType,
  CSSASTSyntax,
} from "gonzales-pe";
import { isArray, last } from "lodash";
import prettierParserBabel from "prettier/parser-babel";
import prettierParsesPostcss from "prettier/parser-postcss";
import { format } from "prettier/standalone";
import { parse, print, types, visit } from "recast";

import { RemoteCodeEntry } from "../project/CodeEntry";
import { ProjectConfig } from "../project/ProjectConfig";
import { isDefined } from "../utils";
import { babelTsParser } from "./babel-ts";

const { builders: b } = types;

export const parseAST = (code: string): t.File =>
  parse(code, {
    parser: babelTsParser,
  });
const printAST = (ast: t.File) =>
  print(clone(ast, undefined, undefined, undefined, true)).code;
const prettyPrintAST = (ast: t.File) =>
  format(printAST(ast), { parser: "babel-ts", plugins: [prettierParserBabel] });

export const parseStyleSheetAST = (codeEntry: RemoteCodeEntry) => {
  const syntax = codeEntry.styleEntryExtension;
  const ast = gonzales.parse(codeEntry.code || "", {
    syntax,
  });
  // fill in a default syntax if the ast has none (which can happen for empty files)
  ast.syntax = ast.syntax || syntax;
  return ast;
};
const printStyleSheetAST = (ast: CSSASTNode) => ast.toString();
const prettyPrintStyleSheetAST = (
  codeEntry: RemoteCodeEntry,
  ast: CSSASTNode
) => {
  const syntax = codeEntry.styleEntryExtension;
  const code = printStyleSheetAST(ast);

  // prettier doesn't support sass https://github.com/prettier/prettier/issues/4948
  if (syntax === "sass") {
    return code;
  }

  return format(code, { parser: syntax, plugins: [prettierParsesPostcss] });
};

export const parseCodeEntryAST = (codeEntry: RemoteCodeEntry) =>
  codeEntry.isStyleEntry
    ? parseStyleSheetAST(codeEntry)
    : parseAST(codeEntry.code || "");
export const printCodeEntryAST = (
  codeEntry: RemoteCodeEntry,
  ast: CSSASTNode | t.File
) =>
  codeEntry.isStyleEntry
    ? printStyleSheetAST(ast as CSSASTNode)
    : printAST(ast as t.File);
export const prettyPrintCodeEntryAST = (
  config: ProjectConfig,
  codeEntry: RemoteCodeEntry,
  ast: CSSASTNode | t.File
) => {
  if (!config.isPrettierEnabled()) return printCodeEntryAST(codeEntry, ast);

  return codeEntry.isStyleEntry
    ? prettyPrintStyleSheetAST(codeEntry, ast as CSSASTNode)
    : prettyPrintAST(ast as t.File);
};

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
export const ifJSXMemberExpression = (
  node: t.Node | null | undefined
): t.JSXMemberExpression | undefined =>
  node?.type === "JSXMemberExpression"
    ? (node as t.JSXMemberExpression)
    : undefined;
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

export const eitherIf = <S, T, U extends S>(check: (n: S) => T | undefined) => (
  n: U
) => {
  const checkRes = check(n);
  if (checkRes !== undefined) {
    return left(checkRes);
  }
  return right(n as Exclude<U, T>);
};

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

export const getName = <S, T extends { name?: S }>(
  node: T | null | undefined
): ExtractPropType<T, "name"> | undefined => node?.name as any;

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
              key: pipe(
                prop.key,
                eitherIf(ifStringLiteral),
                fold(getValue, (a) => pipe(a, ifIdentifier, (_) => _?.name))
              ),
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
      return undefined;
    },
  });
};

/**
 * Gets all the variables defined at the top level of the program
 */
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
      case "ImportDefaultSpecifier":
      case "ImportSpecifier":
        if (node.local) {
          identifiers.push(...getBlockIdentifiers([node.local], newParents));
        }
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
        if (node.id) {
          identifiers.push(...getBlockIdentifiers([node.id], newParents));
        }
        break;
      case "ClassDeclaration":
        if (node.id !== null) {
          identifiers.push(...getBlockIdentifiers([node.id], newParents));
        }
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
  // todo support class expressions
  // todo check class extends React.Component/React.PureComponent

  // get all the variables defined at the top level of the program
  let astIdentifiersCache: ReturnType<typeof getBlockIdentifiers>;
  function getIdentifierDeclaration(identifier: string) {
    return (
      astIdentifiersCache ||
      (astIdentifiersCache = getBlockIdentifiers([ast.program]))
    ).find((ai) => ai.name === identifier);
  }

  /**
   * Makes a guess as to whether the given expression refers to an HoC
   *
   * callee is assumed to be a top level expression
   */
  const isHoC = (callee: ExpressionKind) => {
    let importPath;
    let importMember;

    if (callee.type === "Identifier") {
      const varIdentifier = getIdentifierDeclaration(callee.name);
      // support `import { memo } from "react"; memo()`
      if (!varIdentifier || varIdentifier.parents.length === 0) return false;

      varIdentifier?.parents.forEach((node) => {
        if (node.type === "ImportSpecifier") {
          importMember = node.imported.name;
        }
        if (
          node.type === "ImportDeclaration" &&
          node.source.type === "StringLiteral"
        ) {
          importPath = node.source.value;
        }
      });

      console.log(varIdentifier);
    } else if (
      callee.type === "MemberExpression" &&
      callee.object.type === "Identifier" &&
      callee.property.type === "Identifier"
    ) {
      // support `import React from "react"; React.memo()`
      const calleeObjectName = callee.object.name;
      const calleePropertyName = callee.property.name;
      const varIdentifier = getIdentifierDeclaration(calleeObjectName);

      varIdentifier?.parents.forEach((node) => {
        if (
          varIdentifier.parents.some(
            (p) => p.type === "ImportDefaultSpecifier"
          ) &&
          node.type === "ImportDeclaration" &&
          node.source.type === "StringLiteral"
        ) {
          importPath = node.source.value;
          importMember = calleePropertyName;
        }
      });
    }

    // currently only React.memo is supported
    return importPath === "react" && importMember === "memo";
  };

  /**
   * Checks whether the given top level declaration/expression refers to a function/class/hoc
   */
  const isComponentNode = (
    node: t.ASTNode
  ): { isComponent: boolean; name?: string } => {
    switch (node.type) {
      case "ClassDeclaration":
      case "FunctionDeclaration":
      case "ArrowFunctionExpression":
      case "FunctionExpression": {
        // support function and class components
        return { isComponent: true, name: getIdName(node) };
      }
      case "VariableDeclaration": {
        // search all variable declarations for function definitions
        const componentValue = node.declarations
          .map((declaration) => isComponentNode(declaration))
          .filter((n) => n.isComponent)[0];
        if (componentValue) return componentValue;
        break;
      }
      case "VariableDeclarator":
        if (node.init) {
          return { ...isComponentNode(node.init), name: getIdName(node) };
        }
        break;
      case "CallExpression":
        // support HoCs like React.memo
        return { isComponent: isHoC(node.callee) };
      case "Identifier":
      case "ExportSpecifier": {
        // follow identifiers to their declaration
        const varName =
          node.type === "ExportSpecifier"
            ? getIdName({ id: node.local }) || getIdName({ id: node.exported })
            : node.name;
        const exportedName =
          (node.type === "ExportSpecifier" &&
            getIdName({ id: node.exported })) ||
          varName;
        if (varName !== undefined) {
          const varParent = last(getIdentifierDeclaration(varName)?.parents);
          return {
            isComponent: !!varParent && isComponentNode(varParent).isComponent,
            name: exportedName,
          };
        }
        break;
      }
    }

    return { isComponent: false };
  };

  const exportedFunctions = exportNodes
    .filter(
      (node): node is t.ExportNamedDeclaration | t.ExportDefaultDeclaration =>
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
    )
    .map(
      (node): ReturnType<typeof getComponentExport> => {
        // check whether the the export's declaration is a component
        if (node.declaration) {
          const { isComponent, name } = isComponentNode(node.declaration);
          if (isComponent) {
            // name doesn't matter (and may not exist) for default export
            if (node.type === "ExportDefaultDeclaration")
              return { isDefault: true };
            // name is required for a non-default export
            return name ? { name, isDefault: false } : undefined;
          }
        }

        // check whether any named export specifiers are components
        if (node.type === "ExportNamedDeclaration") {
          const { name } =
            node.specifiers
              ?.map((specifier) => isComponentNode(specifier))
              .filter((r) => r.isComponent)[0] || {};
          // name is required for a non-default export
          return name ? { name, isDefault: false } : undefined;
        }

        return undefined;
      }
    )
    .filter(isDefined);

  // return whether an export was found
  if (exportedFunctions.length === 0) {
    return undefined;
  }

  // prefer default exports, then capitalized exports, and lastly the last export
  return (
    exportedFunctions.find((f) => f.isDefault) ||
    exportedFunctions.find((f) => f.name?.match(/^[A-Z]/)) ||
    exportedFunctions[exportedFunctions.length - 1]!
  );
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
  const newAst = clone(arg0.ast, undefined, undefined, undefined, true);
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
