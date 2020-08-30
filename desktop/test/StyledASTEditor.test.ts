// @ts-nocheck ts can't properly check this file due to the jest fixture transformer
import { namedTypes as t } from "ast-types";

import { StyledASTEditor } from "../src/utils/ast/editors/StyledASTEditor";
import existingStyleBase from "./fixtures/styles/styled/existing-style-base.fixture";
import existingStyleFinal from "./fixtures/styles/styled/existing-style-final.fixture";
import { runEditor } from "./lib/test-utils";

const runStyledEditor = (
  code: string,
  apply: runEditorApply<StyledASTEditor, t.File>
) => runEditor(new StyledASTEditor(), code, "tsx", apply);

describe("StyledASTEditor tests", () => {
  test("applyStyles updates an existing style attribute", () => {
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
