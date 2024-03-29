import { namedTypes as t } from "ast-types";
import {
  ExpressionKind,
  JSXElementKind,
  JSXEmptyExpressionKind,
  JSXExpressionContainerKind,
  JSXFragmentKind,
  LiteralKind,
  PatternKind,
} from "ast-types/gen/kinds";
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
export const prettyPrintTS = (code: string) =>
  format(code, { parser: "babel-ts", plugins: [prettierParserBabel] });
const prettyPrintAST = (ast: t.File) => prettyPrintTS(printAST(ast));

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
export const ifLiteralKind = (
  node: t.Node | null | undefined
): node is LiteralKind =>
  LiteralKindTypes.includes(node?.type as typeof LiteralKindTypes["0"]);

export const eitherIf =
  <S, T, U extends S>(check: (n: S) => T | undefined) =>
  (n: U) => {
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
] as const;

export const astLiteralToValue = (
  value:
    | ExpressionKind
    | JSXEmptyExpressionKind
    | LiteralKind
    | JSXExpressionContainerKind
    | JSXElementKind
    | JSXFragmentKind
    | PatternKind
    | null
): unknown => {
  if (!value) return undefined;
  else if (ifLiteralKind(value))
    return value.type === "NullLiteral" ? null : value.value;
  else if (value.type === "ObjectExpression") {
    return value.properties
      .map((prop) => {
        if (prop.type !== "ObjectProperty") return undefined;
        return {
          key: pipe(
            prop.key,
            eitherIf(ifStringLiteral),
            fold(getValue, (a) => pipe(a, ifIdentifier, (_) => _?.name))
          ),
          value: astLiteralToValue(prop.value),
        };
      })
      .filter((e) => e && e.key !== undefined)
      .reduce((acc: Record<string, unknown>, cur) => {
        acc[cur!.key!] = cur!.value;
        return acc;
      }, {});
  } else if (value.type === "ArrayExpression") {
    return value.elements
      .filter(
        <T extends { type: string }>(e: T | null | t.SpreadElement): e is T =>
          !!e && e.type !== "SpreadElement"
      )
      .map((e) => astLiteralToValue(e));
  }
  // todo support more cases if necessary
  return undefined;
};

export const valueToJSXLiteral = (value: unknown) => {
  // jsx allows string literals for property values
  if (typeof value === "string") return b.stringLiteral(value);
  // jsx treats properties without any value as true
  if (value === true) return null;
  // wrap everything else in an expression container
  return b.jsxExpressionContainer(valueToASTLiteral(value));
};

/**
 *  Get the component props by best effort (won't match non literals)
 */
export const jsxElementAttributesToObject = (element: t.JSXElement) => {
  return (
    element.openingElement.attributes
      ?.map((attr) =>
        pipe(attr, ifJSXAttribute, (_) => {
          if (!_) return undefined;

          const key = pipe(_.name, ifJSXIdentifier, getName);
          if (key === undefined) return undefined;

          let value;
          if (_.value === null) {
            // handle <C prop />, which is equivalent to <C prop={true} />
            value = true;
          } else if (
            _.value &&
            // todo investigate how this is possible https://github.com/benjamn/ast-types/pull/375
            _.value?.type !== "JSXElement" &&
            _.value?.type !== "JSXFragment"
          ) {
            value = astLiteralToValue(
              _.value.type === "JSXExpressionContainer"
                ? _.value.expression
                : _.value
            );
          } else value = undefined;

          return { key, value };
        })
      )
      .filter(isDefined)
      .reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {}) || {}
  );
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
export const getBlockIdentifiers = (
  nodes: t.ASTNode[],
  parents: t.ASTNode[] = []
) => {
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

/**
 * Get a unique name for a new variable in the given block out of all the block-level variable declarations
 */
export function getNewBlockIdentifier(block: t.ASTNode, preferredName: string) {
  const existingIds = getBlockIdentifiers([block]).map((id) => id.name);
  let componentName = preferredName;
  let i = 1;
  while (existingIds.includes(componentName)) {
    componentName = `${preferredName}${++i}`;
  }
  return componentName;
}

type AstComponentExport = (
  | { isDefault: true; name?: undefined }
  | { isDefault: false; name: string }
) & { isStyledComponent?: boolean };

export const getComponentExports = (
  ast: t.File
): {
  preferredExport: AstComponentExport | undefined;
  allExports: AstComponentExport[];
} => {
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
  ): { isComponent: boolean; name?: string; isStyledComponent?: boolean } => {
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
          if (varParent) {
            return { ...isComponentNode(varParent), name: exportedName };
          }
        }
        break;
      }
      // todo use more inference when determining if a component is a styled-component
      case "TaggedTemplateExpression":
        const id =
          node.tag.type === "MemberExpression"
            ? node.tag.object
            : node.tag.type === "CallExpression"
            ? node.tag.callee
            : undefined;
        return {
          isComponent: id?.type === "Identifier" && id.name === "styled",
          isStyledComponent: true,
        };
    }

    return { isComponent: false };
  };

  const exportedFunctions = exportNodes
    .filter(
      (node): node is t.ExportNamedDeclaration | t.ExportDefaultDeclaration =>
        node.type === "ExportNamedDeclaration" ||
        node.type === "ExportDefaultDeclaration"
    )
    .map((node): AstComponentExport | undefined => {
      // check whether the export's declaration is a component
      if (node.declaration) {
        const { isComponent, name, ...props } = isComponentNode(
          node.declaration
        );
        if (isComponent) {
          // name doesn't matter (and may not exist) for default export
          if (node.type === "ExportDefaultDeclaration")
            return { ...props, isDefault: true };
          // name is required for a non-default export
          return name ? { ...props, name, isDefault: false } : undefined;
        }
      }

      // todo does this work if there's multiple components in one export specifier?
      // check whether any named export specifiers are components
      if (node.type === "ExportNamedDeclaration") {
        const { name, ...props } =
          node.specifiers
            ?.map((specifier) => isComponentNode(specifier))
            .filter((r) => r.isComponent)[0] || {};
        // name is required for a non-default export
        return name ? { ...props, name, isDefault: false } : undefined;
      }

      return undefined;
    })
    .filter(isDefined);

  // prefer default exports, then capitalized exports, then styled-component exports, and lastly the last export
  const preferredExport =
    exportedFunctions.find((f) => f.isDefault && !f.isStyledComponent) ||
    exportedFunctions.find(
      (f) => f.name?.match(/^[A-Z]/) && !f.isStyledComponent
    ) ||
    exportedFunctions.find((f) => f.isStyledComponent) ||
    exportedFunctions[exportedFunctions.length - 1]!;

  return {
    preferredExport,
    allExports: exportedFunctions,
  };
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

export const editAST =
  <R, S, T extends object | void, U extends any[]>(
    apply: (arg0: S & { ast: R }, ...rest: U) => T
  ) =>
  (arg0: S & { ast: R }, ...rest: U): T extends void ? R : T & { ast: R } => {
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
  } catch (e) {
    console.warn("failed to register css property", e);
  }
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

export function createStyledDeclaration(
  componentName: string,
  styledTag: string,
  styledMember: string,
  styledContent: string
) {
  return b.variableDeclaration("const", [
    b.variableDeclarator(
      b.identifier(componentName),
      b.taggedTemplateExpression(
        b.memberExpression(b.identifier(styledTag), b.identifier(styledMember)),
        b.templateLiteral(
          [
            b.templateElement(
              { cooked: styledContent, raw: styledContent },
              true
            ),
          ],
          []
        )
      )
    ),
  ]);
}
