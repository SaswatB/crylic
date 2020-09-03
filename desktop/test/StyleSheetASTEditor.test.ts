// @ts-nocheck ts can't properly check this file due to the jest fixture transformer
import { namedTypes as t } from "ast-types";

import { StyleSheetASTEditor } from "synergy/src/lib/ast/editors/StyleSheetASTEditor";

import { runEditor } from "./lib/test-utils";
import existingStyleBase from "./fixtures/styles/scss/existing-style-base.fixture.scss";
import existingStyleFinal from "./fixtures/styles/scss/existing-style-final.fixture.scss";

const runStyledEditor = (
  code: string,
  apply: runEditorApply<StyleSheetASTEditor, t.File>
) => runEditor(new StyleSheetASTEditor(), code, "scss", apply);

describe("StyleSheetASTEditor tests", () => {
  test("applyStyles updates an existing style ruleset", () => {
    const newCode = runStyledEditor(
      existingStyleBase,
      ({ editor, ast, codeEntry, lookupIds }) =>
        editor.applyStyles({ ast, codeEntry, lookupId: lookupIds[0] }, [
          { styleName: "display", styleValue: "flex" },
          { styleName: "backgroundColor", styleValue: "#000000" },
          { styleName: "padding", styleValue: "10px" },
          // null styles are ignored/removed
          { styleName: "color", styleValue: null },
        ])
    );
    expect(newCode).toEqual(existingStyleFinal.replace(/\r/g, ""));
  });
});
