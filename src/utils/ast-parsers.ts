import { namedTypes as t } from "ast-types";
import { NodePath } from "ast-types/lib/node-path";
import { pipe } from "fp-ts/lib/pipeable";
import { kebabCase } from "lodash";
import { types } from "recast";

import {
  copyJSXName,
  createLookupId,
  editAST,
  getValue,
  ifIdentifier,
  ifJSXAttribute,
  ifJSXExpressionContainer,
  ifObjectExpression,
  ifObjectProperty,
  ifStringLiteral,
  traverseJSXElements,
  traverseStyledTemplatesElements,
  valueToASTLiteral,
  valueToJSXLiteral,
} from "./ast-helpers";
import {
  JSX_LOOKUP_DATA_ATTR,
  JSX_RECENTLY_ADDED_DATA_ATTR,
  STYLED_LOOKUP_CSS_VAR_PREFIX,
} from "./constants";

const { builders: b } = types;

const STYLED_LOOKUP_MATCHER = new RegExp(
  `${STYLED_LOOKUP_CSS_VAR_PREFIX}(\\d+): 1;`
);

// fix missing token prop from in types
declare module "ast-types/gen/namedTypes" {
  namespace namedTypes {
    interface Position {
      token?: number;
    }
  }
}

export type Styles = {
  styleName: keyof CSSStyleDeclaration;
  styleValue: string;
}[];

export interface AddLookupDataResult {
  ast: t.File;
  jsxElementLookupIds: string[];
  styledElementLookupIds: string[];
}

export const addLookupData = editAST(
  (ast, codeId: string): AddLookupDataResult => {
    let jsxElementLookupIds: string[] = [];
    traverseJSXElements(ast, (path, index) => {
      const lookupId = createLookupId(codeId, index);
      const attr = b.jsxAttribute(
        b.jsxIdentifier(`data-${JSX_LOOKUP_DATA_ATTR}`),
        b.stringLiteral(lookupId)
      );
      path.value.openingElement.attributes?.push(attr);
      jsxElementLookupIds.push(lookupId);
    });
    let styledElementLookupIds: string[] = [];
    traverseStyledTemplatesElements(ast, (path, index) => {
      const lookupId = createLookupId(codeId, index);
      path.value.quasi.quasis[0].value.raw = `${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}: 1;${path.value.quasi.quasis[0].value.raw}`;
      styledElementLookupIds.push(lookupId);
    });
    console.log("ast", ast);
    return {
      ast,
      jsxElementLookupIds,
      styledElementLookupIds,
    };
  }
);

export const removeLookupData = editAST((ast) => {
  traverseJSXElements(ast, (path) => {
    const { openingElement } = path.value;
    openingElement.attributes = openingElement.attributes?.filter(
      (attr) =>
        ifJSXAttribute(attr)?.name.name !== `data-${JSX_LOOKUP_DATA_ATTR}`
    );
  });
  traverseStyledTemplatesElements(ast, (path) => {
    const { value } = path.value.quasi.quasis[0];
    value.raw = value.raw.replace(STYLED_LOOKUP_MATCHER, "");
  });
});

export const editJSXElementByLookupId = editAST(
  (
    ast,
    lookupId: string,
    apply: (path: NodePath<types.namedTypes.JSXElement, t.JSXElement>) => void
  ) => {
    traverseJSXElements(ast, (path) => {
      const lookupMatches = path.value.openingElement.attributes?.find(
        (attr) =>
          ifJSXAttribute(attr)?.name.name === `data-${JSX_LOOKUP_DATA_ATTR}` &&
          pipe(attr, ifJSXAttribute, getValue, ifStringLiteral, getValue) ===
            lookupId
      );
      if (lookupMatches) apply(path);
    });
  }
);

export const editStyledTemplateByLookup = editAST(
  (
    ast,
    lookupId: string,
    apply: (
      path: NodePath<
        types.namedTypes.TaggedTemplateExpression,
        t.TaggedTemplateExpression
      >
    ) => void
  ) => {
    traverseStyledTemplatesElements(ast, (path) => {
      const res = STYLED_LOOKUP_MATCHER.exec(
        path.value.quasi.quasis[0].value.raw
      );
      if (res?.[1] === lookupId) apply(path);
    });
  }
);

export const removeRecentlyAddedDataAttrAndGetLookupId = editAST((ast) => {
  let resultIndex: number | undefined;
  traverseJSXElements(ast, (path, index) => {
    const hasRecentlyAddedDataAttr = path.value.openingElement.attributes?.find(
      (attr) =>
        ifJSXAttribute(attr)?.name.name ===
        `data-${JSX_RECENTLY_ADDED_DATA_ATTR}`
    );
    if (hasRecentlyAddedDataAttr) {
      path.value.openingElement.attributes = path.value.openingElement.attributes!.filter(
        (attr) =>
          ifJSXAttribute(attr)?.name.name !==
          `data-${JSX_RECENTLY_ADDED_DATA_ATTR}`
      );
      resultIndex = index;
    }
  });
  return { resultIndex };
});

export const getJSXASTByLookupIndex = (ast: t.File, lookupIndex: number) => {
  let result: NodePath<types.namedTypes.JSXElement, t.JSXElement> | undefined;
  traverseJSXElements(ast, (path, index) => {
    if (index === lookupIndex) result = path;
  });
  return result;
};

export const getJSXElementForSourceCodePosition = (
  ast: t.File,
  line: number,
  column: number
) => {
  let result: NodePath<types.namedTypes.JSXElement, t.JSXElement> | undefined;
  let resultId: number | undefined;
  let tokenCount: number | undefined;
  traverseJSXElements(ast, (path, index) => {
    const { start, end } = path?.value?.loc || {};
    if (
      start &&
      end &&
      (line > start.line || (line === start.line && column >= start.column)) &&
      (line < end.line || (line === end.line && column <= end.column)) &&
      (tokenCount === undefined ||
        tokenCount > (end.token || 0) - (start.token || 0))
    ) {
      result = path;
      resultId = index;
      tokenCount = (end.token || 0) - (start.token || 0);
    }
  });
  return { path: result, lookupIndex: resultId };
};

// these are expected to be used in callbacks of editJSXElementByLookupId and editStyledTemplateByLookup
// as they mutate the ast

export const addJSXChildToJSXElement = (
  parentElement: t.JSXElement,
  childElementTag: string,
  childAttributes: Record<string, unknown> = {},
  childShouldBeSelfClosing = false
) => {
  parentElement.children = [
    ...(parentElement.children || []),
    b.jsxElement(
      b.jsxOpeningElement(
        b.jsxIdentifier(childElementTag),
        Object.entries(childAttributes).map(([name, value]) =>
          b.jsxAttribute(b.jsxIdentifier(name), valueToJSXLiteral(value))
        ),
        childShouldBeSelfClosing
      ),
      childShouldBeSelfClosing
        ? undefined
        : b.jsxClosingElement(b.jsxIdentifier(childElementTag))
    ),
  ];
  // if the parent was self closing, open it up
  if (parentElement.openingElement.selfClosing) {
    parentElement.closingElement = b.jsxClosingElement(
      copyJSXName(parentElement.openingElement.name)
    );
    parentElement.openingElement.selfClosing = false;
  }
};

export const applyJSXInlineStyleAttribute = (
  path: NodePath<types.namedTypes.JSXElement, t.JSXElement>,
  styles: Styles
) => {
  let existingStyleAttr = path.value.openingElement.attributes?.find(
    (attr) => attr.type === "JSXAttribute" && attr.name.name === `style`
  );
  if (!existingStyleAttr) {
    path.value.openingElement.attributes =
      path.value.openingElement.attributes || [];
    existingStyleAttr = b.jsxAttribute(
      b.jsxIdentifier("style"),
      valueToJSXLiteral({})
    );
    path.value.openingElement.attributes.push(existingStyleAttr);
  }
  styles.forEach(({ styleName, styleValue }) => {
    // todo handle more cases
    const existingStyleProp = pipe(
      existingStyleAttr,
      ifJSXAttribute,
      getValue,
      ifJSXExpressionContainer,
      (_) => _?.expression,
      ifObjectExpression,
      (_) => _?.properties
    )?.find(
      (prop): prop is t.ObjectProperty =>
        pipe(
          prop,
          ifObjectProperty,
          (_) => _?.key,
          ifIdentifier,
          (_) => _?.name
        ) === styleName
    );
    console.log("existingStyleProp", existingStyleProp);
    if (existingStyleProp) {
      existingStyleProp.value = valueToASTLiteral(styleValue);
      return;
    }
    const existingStylePropObject = pipe(
      existingStyleAttr,
      ifJSXAttribute,
      getValue,
      ifJSXExpressionContainer,
      (_) => _?.expression,
      ifObjectExpression,
      (_) => _?.properties
    );
    existingStylePropObject?.push(
      b.objectProperty(
        b.identifier(`${styleName}`),
        valueToASTLiteral(styleValue)
      )
    );
  });
};

export const applyStyledStyleAttribute = (
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
