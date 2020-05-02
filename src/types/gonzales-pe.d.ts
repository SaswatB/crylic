declare module "gonzales-pe" {
  export type CSSASTNodeType =
    | "arguments"
    | "atkeyword"
    | "atrule"
    | "attributeFlags"
    | "attributeMatch"
    | "attributeName"
    | "attributeSelector"
    | "attributeValue"
    | "block"
    | "brackets"
    | "class"
    | "color"
    | "combinator"
    | "condition"
    | "conditionalStatement"
    | "declaration"
    | "declarationDelimiter"
    | "default"
    | "delimiter"
    | "dimension"
    | "escapedString"
    | "extend"
    | "expression"
    | "function"
    | "global"
    | "id"
    | "ident"
    | "important"
    | "include"
    | "interpolatedVariable"
    | "interpolation"
    | "keyframesSelector"
    | "loop"
    | "mixin"
    | "multilineComment"
    | "namePrefix"
    | "namespacePrefix"
    | "namespaceSeparator"
    | "number"
    | "operator"
    | "parentheses"
    | "parentSelector"
    | "parentSelectorExtension"
    | "percentage"
    | "placeholder"
    | "progid"
    | "property"
    | "propertyDelimiter"
    | "pseudoClass"
    | "pseudoElement"
    | "raw"
    | "ruleset"
    | "space"
    | "selector"
    | "singlelineComment"
    | "string"
    | "stylesheet"
    | "typeSelector"
    | "unicodeRange"
    | "universalSelector"
    | "urange"
    | "uri"
    | "value"
    | "variable"
    | "variablesList";

  type Syntax = "css" | "less" | "sass" | "scss";

  export interface CSSASTNode {
    type: CSSASTNodeType;
    content: CSSASTNode[] | string;
    syntax: Syntax;
    start: { line: number; column: number };
    end: { line: number; column: number };

    contains(type: CSSASTNodeType): boolean;
    is(type: CSSASTNodeType): boolean;

    first(type?: CSSASTNodeType): CSSASTNode | null;
    get(index: number): CSSASTNode | null;
    last(type?: CSSASTNodeType): CSSASTNode | null;

    eachFor(callback: (node: CSSASTNode) => void);
    eachFor(type: CSSASTNodeType, callback: (node: CSSASTNode) => void);
    forEach(callback: (node: CSSASTNode) => void);
    forEach(type: CSSASTNodeType, callback: (node: CSSASTNode) => void);

    insert(index: number, node: CSSASTNode);
    removeChild(index: number): [CSSASTNode] | [];

    toJson(): string;
    toString(): string;

    traverse(callback: (node: CSSASTNode) => void);
    traverseByType(type: CSSASTNodeType, callback: (node: CSSASTNode) => void);
    traverseByTypes(
      types: CSSASTNodeType[],
      callback: (node: CSSASTNode) => void
    );
  }

  declare function createNode(
    options: Pick<CSSASTNode, "type" | "content">
  ): CSSASTNode;
  declare function parse(
    code: string,
    options?: { syntax?: Syntax; context?: CSSASTNodeType; tabSize?: number }
  ): CSSASTNode;
}
