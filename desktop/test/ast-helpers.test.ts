import { getComponentExports, parseAST } from "synergy/src/lib/ast/ast-helpers";

import exportDefaultFunctionExpressionFixture from "./fixtures/component-name/export-default-function-expression.fixture";
import exportDefaultFunctionFixture from "./fixtures/component-name/export-default-function.fixture";
import exportDefaultLambdaFixture from "./fixtures/component-name/export-default-lambda.fixture";
import exportDefaultMemoExplicitImportFixture from "./fixtures/component-name/export-default-memo-explicit-import.fixture";
import exportDefaultMemoRenamedImportFixture from "./fixtures/component-name/export-default-memo-renamed-import.fixture";
import exportDefaultMemoFixture from "./fixtures/component-name/export-default-memo.fixture";
// @ts-expect-error fixture
import exportNamedFunctionExpressionWithNameFixture from "./fixtures/component-name/export-named-function-expression-with-name.fixture";
// @ts-expect-error fixture
import exportNamedFunctionExpressionFixture from "./fixtures/component-name/export-named-function-expression.fixture";
// @ts-expect-error fixture
import exportNamedFunctionFixture from "./fixtures/component-name/export-named-function.fixture";
// @ts-expect-error fixture
import exportNamedLambdaFixture from "./fixtures/component-name/export-named-lambda.fixture";
// @ts-expect-error fixture
import exportNamedMemoFixture from "./fixtures/component-name/export-named-memo.fixture";
// @ts-expect-error fixture
import exportNamedStyledHoCFixture from "./fixtures/component-name/export-named-styled-hoc.fixture";
// @ts-expect-error fixture
import exportNamedStyledWithFunctionFixture from "./fixtures/component-name/export-named-styled-with-function.fixture";
// @ts-expect-error fixture
import exportNamedStyledFixture from "./fixtures/component-name/export-named-styled.fixture";
import exportSeparateDefaultFunctionFixture from "./fixtures/component-name/export-separate-default-function.fixture";
import exportSeparateDefaultLambdaFixture from "./fixtures/component-name/export-separate-default-lambda.fixture";
import exportSeparateDefaultMemoFixture from "./fixtures/component-name/export-separate-default-memo.fixture";
// @ts-expect-error fixture
import exportSeparateNamedFunctionFixture from "./fixtures/component-name/export-separate-named-function.fixture";
// @ts-expect-error fixture
import exportSeparateNamedLambdaFixture from "./fixtures/component-name/export-separate-named-lambda.fixture";
// @ts-expect-error fixture
import exportSeparateNamedMemoFixture from "./fixtures/component-name/export-separate-named-memo.fixture";
// @ts-expect-error fixture
import exportSeparateRenamedMemoFixture from "./fixtures/component-name/export-separate-renamed-memo.fixture";
// @ts-expect-error fixture
import noComponentExportFixture from "./fixtures/component-name/no-component-export.fixture";

// these are imported as fixtures so they're actually strings
const exportDefaultFunctionExpression = (exportDefaultFunctionExpressionFixture as unknown) as string;
const exportDefaultFunction = (exportDefaultFunctionFixture as unknown) as string;
const exportDefaultLambda = (exportDefaultLambdaFixture as unknown) as string;
const exportDefaultMemoExplicitImport = (exportDefaultMemoExplicitImportFixture as unknown) as string;
const exportDefaultMemoRenamedImport = (exportDefaultMemoRenamedImportFixture as unknown) as string;
const exportDefaultMemo = (exportDefaultMemoFixture as unknown) as string;
const exportNamedFunctionExpressionWithName = (exportNamedFunctionExpressionWithNameFixture as unknown) as string;
const exportNamedFunctionExpression = (exportNamedFunctionExpressionFixture as unknown) as string;
const exportNamedFunction = (exportNamedFunctionFixture as unknown) as string;
const exportNamedLambda = (exportNamedLambdaFixture as unknown) as string;
const exportNamedMemo = (exportNamedMemoFixture as unknown) as string;
const exportNamedStyled = (exportNamedStyledFixture as unknown) as string;
const exportNamedStyledHoC = (exportNamedStyledHoCFixture as unknown) as string;
const exportSeparateDefaultFunction = (exportSeparateDefaultFunctionFixture as unknown) as string;
const exportNamedStyledWithFunction = (exportNamedStyledWithFunctionFixture as unknown) as string;
const exportSeparateDefaultLambda = (exportSeparateDefaultLambdaFixture as unknown) as string;
const exportSeparateDefaultMemo = (exportSeparateDefaultMemoFixture as unknown) as string;
const exportSeparateNamedFunction = (exportSeparateNamedFunctionFixture as unknown) as string;
const exportSeparateNamedLambda = (exportSeparateNamedLambdaFixture as unknown) as string;
const exportSeparateNamedMemo = (exportSeparateNamedMemoFixture as unknown) as string;
const exportSeparateRenamedMemo = (exportSeparateRenamedMemoFixture as unknown) as string;
const noComponentExport = (noComponentExportFixture as unknown) as string;

describe("getComponentExports", () => {
  test("gets name from simple exported function component", () => {
    const comp = getComponentExports(parseAST(exportNamedFunction))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedFunction");
  });
  test("gets name from simple exported function expression component", () => {
    const comp = getComponentExports(parseAST(exportNamedFunctionExpression))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedFunctionExpression");
  });
  test("gets name from simple exported function expression component with function name", () => {
    const comp = getComponentExports(
      parseAST(exportNamedFunctionExpressionWithName)
    ).preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedFunctionExpressionExport");
  });
  test("gets name from simple exported lambda function component", () => {
    const comp = getComponentExports(parseAST(exportNamedLambda))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedLambda");
  });
  test("gets name from an exported memo component", () => {
    const comp = getComponentExports(parseAST(exportNamedMemo)).preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedMemo");
  });
  test("gets name from an exported styled component", () => {
    const comp = getComponentExports(parseAST(exportNamedStyled))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("StyledDiv");
  });
  test("gets name from an exported styled component", () => {
    const comp = getComponentExports(parseAST(exportNamedStyledHoC))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("StyledDiv");
  });
  test("prefers function component over styled component", () => {
    const { preferredExport, allExports } = getComponentExports(
      parseAST(exportNamedStyledWithFunction)
    );
    expect(preferredExport?.isDefault).toEqual(false);
    expect(preferredExport?.name).toEqual("MyComponent");
    expect(allExports.length).toEqual(2);
    expect(allExports[0]?.name).toEqual("StyledDiv");
    expect(allExports[1]?.name).toEqual("MyComponent");
  });

  test("gets export from simple default exported function component", () => {
    const comp = getComponentExports(parseAST(exportDefaultFunction))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from simple default exported function expression component", () => {
    const comp = getComponentExports(parseAST(exportDefaultFunctionExpression))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from simple default exported lambda function component", () => {
    const comp = getComponentExports(parseAST(exportDefaultLambda))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from a default exported memo component", () => {
    const comp = getComponentExports(parseAST(exportDefaultMemo))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from a default exported memo component, with memo explicitly imported", () => {
    const comp = getComponentExports(parseAST(exportDefaultMemoExplicitImport))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from a default exported memo component, with memo explicitly imported and renamed", () => {
    const comp = getComponentExports(parseAST(exportDefaultMemoRenamedImport))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });

  test("gets name from simple exported function component that's separate from the export", () => {
    const comp = getComponentExports(parseAST(exportSeparateNamedFunction))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ASeparateNamedFunction");
  });
  test("gets name from simple exported lambda function component that's separate from the export", () => {
    const comp = getComponentExports(parseAST(exportSeparateNamedLambda))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ASeparateNamedLambda");
  });
  test("gets name from an exported memo component that's separate from the export", () => {
    const comp = getComponentExports(parseAST(exportSeparateNamedMemo))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ASeparateMemo");
  });
  test("gets name from an exported memo component that's separate from the export and renamed", () => {
    const comp = getComponentExports(parseAST(exportSeparateRenamedMemo))
      .preferredExport;
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ASeparateMemoRenamed");
  });
  test("gets export from simple default exported lambda function component that's separate from the export", () => {
    const comp = getComponentExports(parseAST(exportSeparateDefaultFunction))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from simple default exported function component that's separate from the export", () => {
    const comp = getComponentExports(parseAST(exportSeparateDefaultLambda))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from a default exported memo component that's separate from the export", () => {
    const comp = getComponentExports(parseAST(exportSeparateDefaultMemo))
      .preferredExport;
    expect(comp?.isDefault).toEqual(true);
  });

  test("doesn't get component from file without a component", () => {
    const comp = getComponentExports(parseAST(noComponentExport))
      .preferredExport;
    expect(comp).toBeUndefined();
  });
});
