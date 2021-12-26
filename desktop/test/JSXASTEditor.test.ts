import { namedTypes as t } from "ast-types";

import { JSXASTEditor } from "synergy/src/lib/ast/editors/JSXASTEditor";

import existingStyleBaseFixture from "./fixtures/styles/inline/existing-style-base.fixture";
import existingStyleFinalFixture from "./fixtures/styles/inline/existing-style-final.fixture";
import noStyleBaseFixture from "./fixtures/styles/inline/no-style-base.fixture";
import noStyleFinalFixture from "./fixtures/styles/inline/no-style-final.fixture";
import { runEditor, runEditorApply } from "./lib/test-utils";

// these are imported as fixtures so they're actually strings
const existingStyleBase = (existingStyleBaseFixture as unknown) as string;
const existingStyleFinal = (existingStyleFinalFixture as unknown) as string;
const noStyleBase = (noStyleBaseFixture as unknown) as string;
const noStyleFinal = (noStyleFinalFixture as unknown) as string;

const runJSXEditor = (
  code: string,
  apply: runEditorApply<JSXASTEditor, t.File>
) => runEditor(new JSXASTEditor(), code, "tsx", apply);

describe("JSXASTEditor tests", () => {
  test("applyStyles adds a new style attribute", () => {
    const newCode = runJSXEditor(
      noStyleBase,
      ({ editor, ast, codeEntry, lookupIds }) =>
        editor.applyStyles(
          { ast, codeEntry, lookupId: lookupIds[0]! },
          {
            display: "flex",
            backgroundColor: "#000000",
            // null styles are ignored/removed
            color: null,
          }
        )
    );
    expect(newCode).toEqual(noStyleFinal);
  });
  test("applyStyles updates an existing style attribute", () => {
    const newCode = runJSXEditor(
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
    expect(newCode).toEqual(existingStyleFinal);
  });
});
