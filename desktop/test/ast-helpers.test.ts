import { getComponentExport, parseAST } from "synergy/src/lib/ast/ast-helpers";

import exportDefaultFunctionExpressionFixture from "./fixtures/component-name/export-default-function-expression.fixture";
import exportDefaultFunctionFixture from "./fixtures/component-name/export-default-function.fixture";
import exportDefaultLambdaFixture from "./fixtures/component-name/export-default-lambda.fixture";
// @ts-expect-error fixture
import exportNamedFunctionExpressionWithNameFixture from "./fixtures/component-name/export-named-function-expression-with-name.fixture";
// @ts-expect-error fixture
import exportNamedFunctionExpressionFixture from "./fixtures/component-name/export-named-function-expression.fixture";
// @ts-expect-error fixture
import exportNamedFunctionFixture from "./fixtures/component-name/export-named-function.fixture";
// @ts-expect-error fixture
import exportNamedLambdaFixture from "./fixtures/component-name/export-named-lambda.fixture";
import exportSeparateDefaultFunctionFixture from "./fixtures/component-name/export-separate-default-function.fixture";
import exportSeparateDefaultLambdaFixture from "./fixtures/component-name/export-separate-default-lambda.fixture";
// @ts-expect-error fixture
import exportSeparateNamedFunctionFixture from "./fixtures/component-name/export-separate-named-function.fixture";
// @ts-expect-error fixture
import exportSeparateNamedLambdaFixture from "./fixtures/component-name/export-separate-named-lambda.fixture";
// @ts-expect-error fixture
import noComponentExportFixture from "./fixtures/component-name/no-component-export.fixture";

// these are imported as fixtures so they're actually strings
const exportDefaultFunctionExpression = (exportDefaultFunctionExpressionFixture as unknown) as string;
const exportDefaultFunction = (exportDefaultFunctionFixture as unknown) as string;
const exportDefaultLambda = (exportDefaultLambdaFixture as unknown) as string;
const exportNamedFunctionExpressionWithName = (exportNamedFunctionExpressionWithNameFixture as unknown) as string;
const exportNamedFunctionExpression = (exportNamedFunctionExpressionFixture as unknown) as string;
const exportNamedFunction = (exportNamedFunctionFixture as unknown) as string;
const exportNamedLambda = (exportNamedLambdaFixture as unknown) as string;
const exportSeparateDefaultFunction = (exportSeparateDefaultFunctionFixture as unknown) as string;
const exportSeparateDefaultLambda = (exportSeparateDefaultLambdaFixture as unknown) as string;
const exportSeparateNamedFunction = (exportSeparateNamedFunctionFixture as unknown) as string;
const exportSeparateNamedLambda = (exportSeparateNamedLambdaFixture as unknown) as string;
const noComponentExport = (noComponentExportFixture as unknown) as string;

describe("getComponentExport", () => {
  test("gets name from simple exported function component", () => {
    const comp = getComponentExport(parseAST(exportNamedFunction));
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedFunction");
  });
  test("gets name from simple exported function expression component", () => {
    const comp = getComponentExport(parseAST(exportNamedFunctionExpression));
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedFunctionExpression");
  });
  test("gets name from simple exported function expression component with function name", () => {
    const comp = getComponentExport(
      parseAST(exportNamedFunctionExpressionWithName)
    );
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedFunctionExpressionExport");
  });
  test("gets name from simple exported lambda function component", () => {
    const comp = getComponentExport(parseAST(exportNamedLambda));
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ANamedLambda");
  });

  test("gets export from simple default exported function component", () => {
    const comp = getComponentExport(parseAST(exportDefaultFunction));
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from simple default exported function expression component", () => {
    const comp = getComponentExport(parseAST(exportDefaultFunctionExpression));
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from simple default exported lambda function component", () => {
    const comp = getComponentExport(parseAST(exportDefaultLambda));
    expect(comp?.isDefault).toEqual(true);
  });

  test("gets name from simple exported function component that's separate from the export", () => {
    const comp = getComponentExport(parseAST(exportSeparateNamedFunction));
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ASeparateNamedFunction");
  });
  test("gets name from simple exported lambda function component that's separate from the export", () => {
    const comp = getComponentExport(parseAST(exportSeparateNamedLambda));
    expect(comp?.isDefault).toEqual(false);
    expect(comp?.name).toEqual("ASeparateNamedLambda");
  });
  test("gets export from simple default exported lambda function component that's separate from the export", () => {
    const comp = getComponentExport(parseAST(exportSeparateDefaultFunction));
    expect(comp?.isDefault).toEqual(true);
  });
  test("gets export from simple default exported function component that's separate from the export", () => {
    const comp = getComponentExport(parseAST(exportSeparateDefaultLambda));
    expect(comp?.isDefault).toEqual(true);
  });

  test("doesn't get component from file without a component", () => {
    const comp = getComponentExport(parseAST(noComponentExport));
    expect(comp).toBeUndefined();
  });
});
