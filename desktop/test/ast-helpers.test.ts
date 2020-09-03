// @ts-nocheck ts can't properly check this file due to the jest fixture transformer
import { getComponentExport, parseAST } from "synergy/src/lib/ast/ast-helpers";

import exportDefaultFunctionExpression from "./fixtures/component-name/export-default-function-expression.fixture";
import exportDefaultFunction from "./fixtures/component-name/export-default-function.fixture";
import exportDefaultLambda from "./fixtures/component-name/export-default-lambda.fixture";
import exportNamedFunctionExpressionWithName from "./fixtures/component-name/export-named-function-expression-with-name.fixture";
import exportNamedFunctionExpression from "./fixtures/component-name/export-named-function-expression.fixture";
import exportNamedFunction from "./fixtures/component-name/export-named-function.fixture";
import exportNamedLambda from "./fixtures/component-name/export-named-lambda.fixture";
import exportSeparateDefaultFunction from "./fixtures/component-name/export-separate-default-function.fixture";
import exportSeparateDefaultLambda from "./fixtures/component-name/export-separate-default-lambda.fixture";
import exportSeparateNamedFunction from "./fixtures/component-name/export-separate-named-function.fixture";
import exportSeparateNamedLambda from "./fixtures/component-name/export-separate-named-lambda.fixture";
import noComponentExport from "./fixtures/component-name/no-component-export.fixture";

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
