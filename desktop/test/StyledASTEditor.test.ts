import { namedTypes as t } from "ast-types";

import { StyledASTEditor } from "synergy/src/lib/ast/editors/StyledASTEditor";

import existingStyleBaseFixture from "./fixtures/styles/styled/existing-style-base.fixture";
import existingStyleFinalFixture from "./fixtures/styles/styled/existing-style-final.fixture";
import { runEditor, runEditorApply } from "./lib/test-utils";

// these are imported as fixtures so they're actually strings
const existingStyleBase = (existingStyleBaseFixture as unknown) as string;
const existingStyleFinal = (existingStyleFinalFixture as unknown) as string;

const runStyledEditor = (
  code: string,
  apply: runEditorApply<StyledASTEditor, t.File>
) => runEditor(new StyledASTEditor(), code, "tsx", apply);

describe("StyledASTEditor tests", () => {
  test("applyStyles updates an existing style attribute", () => {
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
