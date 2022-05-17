import { pipe } from "fp-ts/lib/pipeable";

import { jsxElementAttributesToObject, parseAST } from "../ast/ast-helpers";
import { printTSTypeWrapper } from "./ts-type-printer";
import { TSTypeW_Object } from "./ts-type-wrapper";

// lm_4673266fee copied interfaces
interface GPTPropFillRequest {
  // a type definition
  // ex: `type Props = { foo: string; bar: number; };`
  type: string;
}
interface GPTPropFillResponse {
  // a component expression
  // ex: `<Component foo="bar" bar={123} />`
  component: string;
}

export async function fillPropsWithGpt(
  componentProps: TSTypeW_Object
): Promise<Record<string, unknown>> {
  try {
    // request the best prop values to use here
    const req: GPTPropFillRequest = {
      // lm_17bf0c76a3 type name is expected to be "Props"
      type: printTSTypeWrapper("Props", componentProps),
    };
    const completion = await fetch(
      "https://red-flower-9447.fly.dev/complete-props",
      {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
        method: "POST",
      }
    );
    const res: GPTPropFillResponse = await completion.json();

    // extract the props from the component expression
    const element = pipe(
      parseAST(res.component),
      (_) => _.program.body[0],
      (_) => (_?.type === "ExpressionStatement" ? _.expression : undefined),
      (_) => (_?.type === "JSXElement" ? _ : undefined)
    );

    return element ? jsxElementAttributesToObject(element) : {};
  } catch (e) {
    console.error(e);
    return {};
  }
}
