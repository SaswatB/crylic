import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { CSSASTNode } from "gonzales-pe";
import { kebabCase } from "lodash";

import { Styles } from "../../../types/paint";
import { CodeEntry } from "../../project/CodeEntry";
import {
  createCSSPropertyDeclaration,
  CSSASTBuilder as cb,
  eitherContent,
  getContent,
  ifArray,
  ifString,
  registerUninheritedCSSProperty,
  traverseStyleSheetRuleSets,
} from "../ast-helpers";
import {
  CSS_STYLE_GROUP_TYPE,
  EditContext,
  ReadContext,
  StyleASTEditor,
  StyleGroup,
} from "./ASTEditor";

export const STYLESHEET_LOOKUP_CSS_VAR_PREFIX = "--paint-stylesheetlookup-";

export class StyleSheetASTEditor extends StyleASTEditor<CSSASTNode> {
  private createdIds = new Set<string>();

  protected addLookupDataToAST({
    ast,
    codeEntry,
  }: {
    ast: CSSASTNode;
    codeEntry: CodeEntry;
  }) {
    let lookupIds: string[] = [];
    traverseStyleSheetRuleSets(ast, (path, index) => {
      const lookupId = this.createLookupId(codeEntry, "ss", index);
      const selector = this.getSelector(path);
      const ruleBlock = this.getRuleBlock(path);
      if (ruleBlock) {
        const lookupRule = createCSSPropertyDeclaration(
          `${STYLESHEET_LOOKUP_CSS_VAR_PREFIX}${lookupId}`,
          (selector && this.printSelector(selector)) || lookupId,
          this.getRuleIndentation(selector),
          ruleBlock.syntax
        );
        (ruleBlock.content as CSSASTNode[]).unshift(...lookupRule);
        lookupIds.push(lookupId);
      }
    });
    lookupIds.forEach((lookupId) => this.createdIds.add(lookupId));
    return { lookupIds };
  }

  protected removeLookupDataFromAST({ ast }: { ast: CSSASTNode }) {
    traverseStyleSheetRuleSets(ast, (path) => {
      const ruleBlock = this.getRuleBlock(path);
      const { lookupId, index } =
        (ruleBlock && this.getRuleBlockLookupId(ruleBlock)) || {};
      if (ruleBlock && lookupId !== undefined && index !== undefined) {
        const ruleBlockContent = ruleBlock.content as CSSASTNode[];
        // clean up spacing and semi-colons after the rule
        if (ruleBlockContent[index + 1]?.type === "declarationDelimiter") {
          const nextNext = ruleBlockContent[index + 2];
          if (
            nextNext?.type === "space" &&
            typeof nextNext.content === "string" &&
            !nextNext.content.includes(" ")
          ) {
            ruleBlock.removeChild(index + 2);
          }
          ruleBlock.removeChild(index + 1);
        } else if (ruleBlockContent[index + 1]?.type === "space") {
          ruleBlock.removeChild(index + 1);
        }
        // remove the lookup rule
        ruleBlock.removeChild(index);
        // clean up spacing before the rule
        if (ruleBlockContent[index - 1]?.type === "space") {
          ruleBlock.removeChild(index - 1);
        }
      }
    });
  }

  public getCodeLineFromLookupId(
    { ast }: ReadContext<CSSASTNode>,
    lookupId: string
  ) {
    let line;
    this.getStyleSheetRuleSetByLookup(ast, lookupId, (path) => {
      line = path.start.line;
    });
    return line;
  }

  public override onASTRender(iframe: HTMLIFrameElement) {
    // prevent property inheritance for data lookup ids
    this.createdIds.forEach((lookupId) =>
      registerUninheritedCSSProperty(
        iframe,
        `${STYLESHEET_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      )
    );
  }

  public getStyleGroupsFromHTMLElement(element: HTMLElement) {
    const computedStyles = window.getComputedStyle(element);
    const styleGroups: StyleGroup[] = [];
    this.createdIds.forEach((lookupId) => {
      const varValue = computedStyles.getPropertyValue(
        `${STYLESHEET_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      );
      if (varValue)
        styleGroups.push({
          type: CSS_STYLE_GROUP_TYPE,
          category: "Style Sheet Rule",
          name: varValue.trim(),
          lookupId,
          editor: this,
        });
    });
    return styleGroups;
  }

  protected applyStylesToAST(
    { ast, lookupId }: EditContext<CSSASTNode>,
    styles: Styles
  ): void {
    let foundRule = false;
    this.getStyleSheetRuleSetByLookup(ast, lookupId, (path) => {
      this.applyStyleSheetStyleAttribute(path, styles);
      foundRule = true;
    });
    if (!foundRule)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  protected updateElementImageInAST(
    context: EditContext<CSSASTNode>,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry | null
  ) {
    let stylesUpdate: Styles;
    if (assetEntry) {
      // get the import for the asset
      const relativeAssetPath = context.codeEntry.getRelativeImportPath(
        assetEntry.filePath
      );
      stylesUpdate = { [imageProp]: `url(${relativeAssetPath})` };
    } else {
      // support delete
      stylesUpdate = { [imageProp]: null };
    }
    // edit the css
    this.applyStylesToAST(context, stylesUpdate);
  }

  protected addStyleGroupToAST({ ast }: EditContext<CSSASTNode>, name: string) {
    (ast.content as CSSASTNode[]).push(
      cb.ruleset([
        cb.selector([cb.class([cb.ident(name)])]),
        cb.space(" "),
        cb.block([cb.space("\n")]),
      ])
    );
  }

  // helpers

  protected printSelector(selector: CSSASTNode) {
    const children: string = pipe(
      selector,
      eitherContent,
      fold(
        (_) => _,
        (_) => _.map(this.printSelector.bind(this)).join(" ")
      )
    );

    switch (selector.type) {
      case "class":
        return `.${children}`;
      case "id":
        return `#${children}`;
      case "universalSelector":
        return `*${children}`;
      default:
        return children;
    }
  }

  protected getSelector(ruleSet: CSSASTNode) {
    return pipe(ruleSet, getContent, ifArray, (_) =>
      _?.find((n) => n.type === "selector")
    );
  }

  protected getRuleIndentation(selector: CSSASTNode | undefined) {
    // add indentation to added rule, needed for sass
    // todo don't hardcode 2 spaces for indentation
    const indentationLength = (selector?.start.column || 1) + 2;
    return new Array(indentationLength - 1).fill(" ").join("");
  }

  protected getRuleBlock(ruleSet: CSSASTNode) {
    return pipe(ruleSet, getContent, ifArray, (_) =>
      _?.find((n) => n.type === "block")
    );
  }

  protected getRuleBlockLookupId(ruleBlock: CSSASTNode) {
    const ruleBlockContent = pipe(ruleBlock, getContent, ifArray) || [];
    for (let index = 0; index < ruleBlockContent.length; index += 1) {
      let blockNode = ruleBlockContent[index];
      if (blockNode?.type !== "declaration") continue;

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

  protected getStyleSheetRuleSetByLookup(
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
    Object.entries(styles).forEach(([styleName, styleValue]) => {
      const cssStyleName = kebabCase(`${styleName}`);

      const existingRuleDeclarationIndex = ruleBlockContent.findIndex(
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
      if (existingRuleDeclarationIndex !== -1) {
        const ruleValue = pipe(
          ruleBlockContent[existingRuleDeclarationIndex],
          getContent,
          ifArray,
          (_) => _?.find((n) => n.type === "value"),
          getContent,
          ifArray,
          (_) => _?.[0]
        );
        if (styleValue === null) {
          // if the style is set to null, delete the declaration
          if (
            ruleBlockContent[existingRuleDeclarationIndex + 1]?.type ===
            "declarationDelimiter"
          ) {
            ruleBlock.removeChild(existingRuleDeclarationIndex + 1);
          }
          ruleBlock.removeChild(existingRuleDeclarationIndex);
          if (
            ruleBlockContent[existingRuleDeclarationIndex - 1]?.type === "space"
          ) {
            ruleBlock.removeChild(existingRuleDeclarationIndex - 1);
          }
          return;
        } else if (ruleValue) {
          // replace existing rule
          ruleValue.type = "ident";
          ruleValue.content = styleValue;
          return;
        }
      }
      if (styleValue === null) {
        return;
      }

      // add rule to the end of the ruleset
      (ruleBlock.content as CSSASTNode[]).push(
        ...createCSSPropertyDeclaration(
          cssStyleName,
          styleValue,
          this.getRuleIndentation(this.getSelector(path)),
          ruleBlock.syntax
        )
      );
    });
  };
}
