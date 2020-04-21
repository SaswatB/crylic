import { pipe } from "fp-ts/lib/pipeable";
import { createNode, CSSASTNode, CSSASTNodeType } from "gonzales-pe";
import { kebabCase } from "lodash";

import { CodeEntry, Styles } from "../../types/paint";
import {
  getContent,
  ifArray,
  ifString,
  registerUninheritedCSSProperty,
  traverseStyleSheetRuleSets,
} from "./ast-helpers";
import { StyleASTEditor } from "./ASTEditor";

export const STYLESHEET_LOOKUP_CSS_VAR_PREFIX = "--paint-stylesheetlookup-";

// convenience builder wrapper over createNode
const b: {
  [index in CSSASTNodeType]: (content: CSSASTNode["content"]) => CSSASTNode;
} = new Proxy({} as any, {
  get(target, type) {
    return (content: CSSASTNode["content"]) =>
      createNode({ type: type as CSSASTNodeType, content });
  },
});

export class StyleSheetASTEditor extends StyleASTEditor<CSSASTNode> {
  private createdIds = new Set<string>();

  protected addLookupDataToAST(ast: CSSASTNode, codeEntry: CodeEntry) {
    let lookupIds: string[] = [];
    traverseStyleSheetRuleSets(ast, (path, index) => {
      const lookupId = this.createLookupId(codeEntry, index);
      const ruleBlock = this.getRuleBlock(path);
      if (ruleBlock) {
        const lookupRule = this.createPropertyDeclaration(
          `${STYLESHEET_LOOKUP_CSS_VAR_PREFIX}${lookupId}`,
          "1"
        );
        (ruleBlock.content as CSSASTNode[]).unshift(...lookupRule);
        lookupIds.push(lookupId);
      }
    });
    lookupIds.forEach((lookupId) => this.createdIds.add(lookupId));
    return { lookupIds };
  }

  protected removeLookupDataFromAST(ast: CSSASTNode) {
    traverseStyleSheetRuleSets(ast, (path) => {
      const ruleBlock = this.getRuleBlock(path);
      const { lookupId, index: lookupRuleIndex } =
        (ruleBlock && this.getRuleBlockLookupId(ruleBlock)) || {};
      if (ruleBlock && lookupId !== undefined) {
        if (
          (ruleBlock.content as CSSASTNode[])[lookupRuleIndex! + 1].type ===
          "declarationDelimiter"
        ) {
          ruleBlock.removeChild(lookupRuleIndex! + 1);
        }
        ruleBlock.removeChild(lookupRuleIndex!);
      }
    });
  }

  public onASTRender(iframe: HTMLIFrameElement) {
    // prevent property inheritance for data lookup ids
    this.createdIds.forEach((lookupId) =>
      registerUninheritedCSSProperty(
        iframe,
        `${STYLESHEET_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      )
    );
  }

  public getLookupIdsFromHTMLElement(element: HTMLElement) {
    const computedStyles = window.getComputedStyle(element);
    const lookupIds: string[] = [];
    this.createdIds.forEach((lookupId) => {
      const varValue = computedStyles.getPropertyValue(
        `${STYLESHEET_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      );
      if (varValue) lookupIds.push(lookupId);
    });
    return lookupIds;
  }

  protected addStylesToAST(
    ast: CSSASTNode,
    codeEntry: CodeEntry,
    lookupId: string,
    styles: Styles
  ): void {
    let madeChange = false;
    this.editStyleSheetRuleSetByLookup(ast, lookupId, (path) => {
      this.applyStyleSheetStyleAttribute(path, styles);
      madeChange = true;
    });
    if (!madeChange)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  // helpers

  protected getRuleBlock(ruleSet: CSSASTNode) {
    return pipe(ruleSet, getContent, ifArray, (_) =>
      _?.find((n) => n.type === "block")
    );
  }

  protected getRuleBlockLookupId(ruleBlock: CSSASTNode) {
    const ruleBlockContent = pipe(ruleBlock, getContent, ifArray) || [];
    for (let index = 0; index < ruleBlockContent.length; index += 1) {
      let blockNode = ruleBlockContent[index];
      if (blockNode.type !== "declaration") continue;

      const lookupId = pipe(
        blockNode,
        getContent,
        ifArray,
        (_) => _?.find((n) => n.type === "property"),
        getContent,
        ifArray,
        (_) => _?.find((n) => n.type === "ident"),
        getContent,
        ifString,
        (_) =>
          _ !== undefined &&
          this.createdIds.has(
            _.substring(STYLESHEET_LOOKUP_CSS_VAR_PREFIX.length)
          )
            ? _.substring(STYLESHEET_LOOKUP_CSS_VAR_PREFIX.length)
            : undefined
      );
      if (lookupId) return { lookupId, index };
    }
    return undefined;
  }

  protected createPropertyDeclaration(name: string, value: string) {
    return [
      b.declaration([
        b.property([b.ident(name)]),
        b.propertyDelimiter(":"),
        b.value([b.ident(value)]),
      ]),
      b.declarationDelimiter(";"),
    ];
  }

  protected editStyleSheetRuleSetByLookup(
    ast: CSSASTNode,
    lookupId: string,
    apply: (path: CSSASTNode) => void
  ) {
    traverseStyleSheetRuleSets(ast, (path) => {
      const ruleBlock = this.getRuleBlock(path);
      const { lookupId: ruleLookupId } =
        (ruleBlock && this.getRuleBlockLookupId(ruleBlock)) || {};
      if (ruleBlock && lookupId === ruleLookupId) apply(path);
    });
  }

  protected applyStyleSheetStyleAttribute = (
    path: CSSASTNode,
    styles: Styles
  ) => {
    const ruleBlock = this.getRuleBlock(path)!;
    const ruleBlockContent = pipe(ruleBlock, getContent, ifArray) || [];
    styles.forEach(({ styleName, styleValue }) => {
      const cssStyleName = kebabCase(`${styleName}`);

      const existingRuleDeclaration = ruleBlockContent.find(
        (blockNode) =>
          blockNode.type === "declaration" &&
          pipe(
            blockNode,
            getContent,
            ifArray,
            (_) => _?.find((n) => n.type === "property"),
            getContent,
            ifArray,
            (_) => _?.find((n) => n.type === "ident"),
            getContent,
            ifString,
            (_) => _ === cssStyleName
          )
      );
      if (existingRuleDeclaration) {
        const ruleValue = pipe(
          existingRuleDeclaration,
          getContent,
          ifArray,
          (_) => _?.find((n) => n.type === "value"),
          getContent,
          ifArray,
          (_) => _?.[0]
        );
        if (ruleValue) {
          // replace existing rule
          ruleValue.type = "ident";
          ruleValue.content = styleValue;
          return;
        }
      }

      // add rule to the end of the ruleset
      (ruleBlock.content as CSSASTNode[]).push(
        ...this.createPropertyDeclaration(cssStyleName, styleValue)
      );
    });
  };
}
