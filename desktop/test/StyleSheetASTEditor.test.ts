import { CSSASTNode } from "gonzales-pe";

import { StyleSheetASTEditor } from "synergy/src/lib/ast/editors/StyleSheetASTEditor";

import { runEditor, runEditorApply } from "./lib/test-utils";
import existingStyleBase from "./fixtures/styles/scss/existing-style-base.fixture.scss";
import existingStyleFinal from "./fixtures/styles/scss/existing-style-final.fixture.scss";

const runStyledEditor = (
  code: string,
  apply: runEditorApply<StyleSheetASTEditor, CSSASTNode>
) => runEditor(new StyleSheetASTEditor(), code, "scss", apply);

describe("StyleSheetASTEditor tests", () => {
  test("applyStyles updates an existing style ruleset", () => {
    const newCode = runStyledEditor(
      existingStyleBase,
      ({ editor, ast, codeEntry, lookupIds }) =>
        editor.applyStyles(
          { ast, codeEntry, lookupId: lookupIds[0]! },
          {
            display: "flex",
            backgroundColor: "#000000",
            padding: "10px",
            // null styles are ignored/removed
            color: null,
          }
        )
    );
    expect(newCode).toEqual(existingStyleFinal.replace(/\r/g, ""));
  });
});
