import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { kebabCase } from "lodash";
import { types } from "recast";

import { CodeEntry, Styles } from "../../types/paint";
import { traverseStyledTemplatesElements } from "./ast-helpers";
import { StyleASTEditor } from "./ASTEditor";

export const STYLED_LOOKUP_CSS_VAR_PREFIX = "--paint-styledlookup-";

const STYLED_LOOKUP_MATCHER = new RegExp(
  `${STYLED_LOOKUP_CSS_VAR_PREFIX}(.+): 1;`
);

export class StyledASTEditor extends StyleASTEditor<t.File> {
  private createdIds = new Set<string>();

  protected addLookupDataToAST(ast: t.File, codeEntry: CodeEntry) {
    let lookupIds: string[] = [];
    traverseStyledTemplatesElements(ast, (path, index) => {
      const lookupId = this.createLookupId(codeEntry, index);
      const { value } = path.value.quasi.quasis[0];
      value.raw = `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}: 1;${value.raw}`;
      lookupIds.push(lookupId);
    });
    lookupIds.forEach((lookupId) => this.createdIds.add(lookupId));
    return {
      lookupIds,
    };
  }

  protected removeLookupDataFromAST(ast: t.File) {
    traverseStyledTemplatesElements(ast, (path) => {
      const { value } = path.value.quasi.quasis[0];
      value.raw = value.raw.replace(STYLED_LOOKUP_MATCHER, "");
    });
  }

  public onASTRender(iframe: HTMLIFrameElement) {
    // prevent property inheritance for data lookup ids
    this.createdIds.forEach((lookupId) => {
      try {
        // @ts-ignore ignore new api missing types
        iframe.contentWindow!.CSS.registerProperty({
          name: `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}`,
          inherits: false,
        });
      } catch (e) {}
    });
  }

  public getLookupIdsFromHTMLElement(element: HTMLElement) {
    const computedStyles = window.getComputedStyle(element);
    const lookupIds: string[] = [];
    this.createdIds.forEach((lookupId) => {
      const varValue = computedStyles.getPropertyValue(
        `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}`
      );
      if (varValue) lookupIds.push(lookupId);
    });
    return lookupIds;
  }

  protected addStylesToAST(
    ast: t.File,
    codeEntry: CodeEntry,
    lookupId: string,
    styles: Styles
  ): void {
    let madeChange = false;
    this.editStyledTemplateByLookup(ast, lookupId, (path) => {
      this.applyStyledStyleAttribute(path, styles);
      madeChange = true;
    });
    if (!madeChange)
      throw new Error(`Could not find element by lookup id ${lookupId}`);
  }

  // helpers

  protected editStyledTemplateByLookup(
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
        path.value.quasi.quasis[0].value.raw
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
    styles.forEach(({ styleName, styleValue }) => {
      const cssStyleName = kebabCase(`${styleName}`);
      const styleMatcher = new RegExp(`($|\\s)\\s*${cssStyleName}: ([^:;]+);`);
      const found = path.value.quasi.quasis.find(({ value: quasiValue }) => {
        const res = styleMatcher.exec(quasiValue.raw);
        if (res) {
          quasiValue.raw = quasiValue.raw.replace(
            styleMatcher,
            `${cssStyleName}: ${styleValue};`
          );
          return true;
        }
        return false;
      });
      if (found) return;

      // add rule to the end of the template
      const quasiValue =
        path.value.quasi.quasis[path.value.quasi.quasis.length - 1].value;
      quasiValue.raw = `${quasiValue.raw}${cssStyleName}: ${styleValue};`;
    });
  };
}
