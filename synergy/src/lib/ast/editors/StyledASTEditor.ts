import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { kebabCase } from "lodash";
import { types } from "recast";

import { Styles } from "../../../types/paint";
import { CodeEntry } from "../../project/CodeEntry";
import {
  registerUninheritedCSSProperty,
  traverseStyledTemplatesElements,
} from "../ast-helpers";
import {
  EditContext,
  ReadContext,
  StyleASTEditor,
  STYLED_COMPONENTS_STYLE_GROUP_TYPE,
  StyleGroup,
} from "./ASTEditor";

const STYLED_LOOKUP_CSS_VAR_PREFIX = "--paint-styledlookup-";

const STYLED_LOOKUP_MATCHER = new RegExp(
  `${STYLED_LOOKUP_CSS_VAR_PREFIX}(.+): 1;`
);

const getStyleMatcherRule = (cssStyleName: string) =>
  `((?:^|\\b|\\s)\\s*)${cssStyleName}: ([^:;]+);`;

export class StyledASTEditor extends StyleASTEditor<t.File> {
  private createdIds = new Set<string>();
  private lookupIdNameMap: Record<string, string | undefined> = {};

  protected addLookupDataToAST({
    ast,
    codeEntry,
  }: {
    ast: t.File;
    codeEntry: CodeEntry;
  }) {
    let lookupIds: string[] = [];
    traverseStyledTemplatesElements(ast, (path, index) => {
      const lookupId = this.createLookupId(codeEntry, "s", index);
      const { value } = path.value.quasi.quasis[0] || {};
      if (value)
        value.raw = `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}: 1;${value.raw}`;
      // get a name for the component by the variable declaration
      // todo support more scenarios
      const parent: NodePath<types.namedTypes.ASTNode, t.ASTNode> | undefined =
        path.parent;
      if (
        parent?.value.type === "VariableDeclarator" &&
        parent.value.id.type === "Identifier"
      ) {
        this.lookupIdNameMap[lookupId] = parent.value.id.name;
      } else {
        this.lookupIdNameMap[lookupId] = undefined;
      }
      lookupIds.push(lookupId);
    });
    lookupIds.forEach((lookupId) => this.createdIds.add(lookupId));
    return {
      lookupIds,
    };
  }

  protected removeLookupDataFromAST({ ast }: { ast: t.File }) {
    traverseStyledTemplatesElements(ast, (path) => {
      const { value } = path.value.quasi.quasis[0] || {};
      if (value) value.raw = value.raw.replace(STYLED_LOOKUP_MATCHER, "");
    });
  }

  public getCodeLineFromLookupId(
    { ast }: ReadContext<t.File>,
    lookupId: string
  ) {
    let line;
    this.getStyledTemplateByLookup(ast, lookupId, (path) => {
      line = path.node.loc?.start.line;
    });
    return line;
  }

  public override onASTRender(iframe: HTMLIFrameElement) {
    // todo investigate using `.class * { ${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}: false }` instead
    // prevent property inheritance for data lookup ids
    this.createdIds.forEach((lookupId) =>
      registerUninheritedCSSProperty(
        iframe,
        `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      )
    );
  }

  public getStyleGroupsFromHTMLElement(element: HTMLElement) {
    const computedStyles = window.getComputedStyle(element);
    const styleGroups: StyleGroup[] = [];
    this.createdIds.forEach((lookupId) => {
      const varValue = computedStyles.getPropertyValue(
        `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      );
      if (varValue) {
        styleGroups.push({
          type: STYLED_COMPONENTS_STYLE_GROUP_TYPE,
          category: "Styled Component",
          // todo unique backup names if there's multiple components
          name: this.lookupIdNameMap[lookupId] || "Styled Component Style",
          lookupId,
          editor: this,
        });
      }
    });
    return styleGroups;
  }

  protected applyStylesToAST(
    { ast, lookupId }: EditContext<t.File>,
    styles: Styles
  ): void {
    let madeChange = false;
    this.getStyledTemplateByLookup(ast, lookupId, (path) => {
      this.applyStyledStyleAttribute(path, styles);
      madeChange = true;
    });
    if (!madeChange)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  protected updateElementImageInAST(
    { ast, lookupId }: EditContext<t.File>,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry | null
  ) {
    throw new Error(
      "Adding images to a styled-component is not currently supported"
    );
  }

  protected addStyleGroupToAST() {
    throw new Error("Unsupported operation: Adding style groups to JSX");
  }

  // helpers

  protected getStyledTemplateByLookup(
    ast: t.File,
    lookupId: string,
    apply: (
      path: NodePath<
        types.namedTypes.TaggedTemplateExpression,
        t.TaggedTemplateExpression
      >
    ) => void
  ) {
    traverseStyledTemplatesElements(ast, (path) => {
      const res = STYLED_LOOKUP_MATCHER.exec(
        path.value.quasi.quasis[0]?.value.raw || ""
      );
      if (res?.[1] === lookupId) apply(path);
    });
  }

  protected applyStyledStyleAttribute = (
    path: NodePath<
      types.namedTypes.TaggedTemplateExpression,
      t.TaggedTemplateExpression
    >,
    styles: Styles
  ) => {
    Object.entries(styles).forEach(([styleName, styleValue]) => {
      const cssStyleName = kebabCase(`${styleName}`);
      const styleMatcherRule = getStyleMatcherRule(cssStyleName);
      const styleMatcher = new RegExp(styleMatcherRule);
      const found = path.value.quasi.quasis.find(({ value: quasiValue }) => {
        const res = styleMatcher.exec(quasiValue.raw);
        if (res) {
          if (styleValue === null) {
            // if the style is set to null, delete the attribute
            quasiValue.raw = quasiValue.raw.replace(
              new RegExp(`\n?${styleMatcherRule}`),
              ""
            );
          } else {
            // replace existing rule
            quasiValue.raw = quasiValue.raw.replace(
              styleMatcher,
              `${res[1]}${cssStyleName}: ${styleValue};`
            );
          }
          return true;
        }
        return false;
      });
      if (found || styleValue === null) return;

      // add rule to the end of the template
      const quasiValue =
        path.value.quasi.quasis[path.value.quasi.quasis.length - 1]!.value;
      const indent =
        new RegExp(getStyleMatcherRule("[^\\s]+")).exec(quasiValue.raw)?.[1] ||
        "  ";
      quasiValue.raw = `${quasiValue.raw}${
        quasiValue.raw.includes("\n") ? "" : "\n"
      }${indent}${cssStyleName}: ${styleValue};\n`;
    });
  };
}
