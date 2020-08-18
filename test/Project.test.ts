import existingStyleBase from "./fixtures/styles/inline/existing-style-base.fixture";
import existingStyleFinal from "./fixtures/styles/inline/existing-style-final.fixture";
import noStyleBase from "./fixtures/styles/inline/no-style-base.fixture";
import noStyleFinal from "./fixtures/styles/inline/no-style-final.fixture";

describe("Project tests", () => {
  test("getCodeEntryMetaData properly sets isRenderable", () => {
    const newCode = runJSXEditor(
      noStyleBase,
      ({ editor, ast, codeEntry, lookupIds }) =>
        editor.applyStyles({ ast, codeEntry, lookupId: lookupIds[0] }, [
          { styleName: "display", styleValue: "flex" },
          { styleName: "backgroundColor", styleValue: "#000000" },
          // null styles are ignored/removed
          { styleName: "color", styleValue: null },
        ])
    );
    expect(newCode).toEqual(noStyleFinal.replace(/\r/g, ""));
  });
  test("applyStyles updates an existing style attribute", () => {
    const newCode = runJSXEditor(
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
