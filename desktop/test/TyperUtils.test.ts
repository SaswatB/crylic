import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { TyperUtils } from "synergy/src/lib/typer/TyperUtils";

import { FilePortablePath } from "../src/lib/project/FilePortablePath";
import { TestProject } from "./lib/test-utils";

function getProps(
  exportTarget: { name: string | undefined; isDefault: boolean },
  ...code: string[]
) {
  return new TyperUtils(
    "/",
    code.map((c, index) =>
      new CodeEntry(
        new TestProject(),
        new FilePortablePath(`/file${index || ""}.tsx`),
        c
      ).getRemoteCodeEntry()
    )
  ).getExportedComponentProps("/file.tsx", exportTarget);
}

describe("TyperUtils tests", () => {
  test("get props from default function without a type annotation", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: true },
      `export default function MyComponent({ test }) {return <div />;}`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "Any" },
    ]);
  });
  test("get props from default function with an inline type definition", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: true },
      `export default function MyComponent(props: { test?: string }) {return <div />;}`
    );
    expect(props).toStrictEqual([
      { optional: true, prop: "test", type: "String" },
    ]);
  });
  test("get props from default function with a type definition in a different file", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: true },
      `
import { Props } from './file1';
export default function MyComponent(props: Props) {return <div />;}`,
      "export type Props = { test: number, test2?: string[] };"
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "Number" },
      { optional: true, prop: "test2", type: "Object" },
    ]);
  });

  test("get props from default lambda function", () => {
    const props = getProps(
      { name: undefined, isDefault: true },
      `export default ({ test }: { test: string }) => {return <div />;}`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
  test("get props from named lambda function", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: false },
      `export const MyComponent = ({ test }: { test: string }) => {return <div />;};`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
  test("get props from named function", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: false },
      `export function MyComponent({ test }: { test: string }) {return <div />;}`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
  test("get props from separate default function", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: true },
      `function MyComponent({ test }: { test: string }) {return <div />;}; export default MyComponent;`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
  test("get props from separate default lambda", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: true },
      `const MyComponent = ({ test }: { test: string }) => {return <div />;}; export default MyComponent;`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
  test("get props from separate named function", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: false },
      `function MyComponent({ test }: { test: string }) {return <div />;}; export { MyComponent };`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
  test("get props from separate named lambda", () => {
    const props = getProps(
      { name: "MyComponent", isDefault: false },
      `const MyComponent = ({ test }: { test: string }) => {return <div />;}; export { MyComponent };`
    );
    expect(props).toStrictEqual([
      { optional: false, prop: "test", type: "String" },
    ]);
  });
});
