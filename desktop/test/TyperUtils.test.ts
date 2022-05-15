import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { TyperUtils } from "synergy/src/lib/typer/TyperUtils";

import { FilePortablePath } from "../src/lib/project/FilePortablePath";
import { TestProject } from "./lib/test-utils";

function matchSnapshotProps(
  exportTarget: { name: string | undefined; isDefault: boolean },
  ...code: string[]
) {
  const props = new TyperUtils(
    "/",
    code.map((c, index) =>
      new CodeEntry(
        new TestProject(),
        new FilePortablePath(`/file${index || ""}.tsx`),
        c
      ).getRemoteCodeEntry()
    )
  ).getExportedComponentProps("/file.tsx", exportTarget);
  expect(props).toMatchSnapshot();
}

describe("TyperUtils tests", () => {
  describe("test type extractor", () => {
    test(" array prop", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export function MyComponent({ test }: { test: string[] }) {return <div />;}`
      );
    });
    test("extracts union prop", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export function MyComponent(props: { test?: string | number }) {return <div />;}`
      );
    });
    test("extracts string literal prop", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export function MyComponent(props: { test?: 'a' | 'b' }) {return <div />;}`
      );
    });
    test("extracts tuple prop", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export function MyComponent(props: { test?: [1, 2] }) {return <div />;}`
      );
    });
    test("extracts function prop", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export function MyComponent(props: { test?: () => void }) {return <div />;}`
      );
    });
    test("extracts enum prop", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `enum TestEnum { A, B }; export function MyComponent(props: { test?: TestEnum }) {return <div />;}`
      );
    });
  });

  describe("test type declaration follower", () => {
    test("get props without a type annotation", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: true },
        `export default function MyComponent({ test }) {return <div />;}`
      );
    });
    test("get props with an inline type definition", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: true },
        `export default function MyComponent(props: { test: string }) {return <div />;}`
      );
    });
    test("get props with a type definition in a different file", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: true },
        `import { Props } from './file1'; export default function MyComponent(props: Props) {return <div />;}`,
        `export type Props = { test: string };`
      );
    });
  });

  describe("test export declaration follower", () => {
    test("get props from default function", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: true },
        `export default function MyComponent({ test }: { test: string }) {return <div />;}`
      );
    });
    test("get props from default lambda function", () => {
      matchSnapshotProps(
        { name: undefined, isDefault: true },
        `export default ({ test }: { test: string }) => {return <div />;}`
      );
    });
    test("get props from named lambda function", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export const MyComponent = ({ test }: { test: string }) => {return <div />;};`
      );
    });
    test("get props from named function", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `export function MyComponent({ test }: { test: string }) {return <div />;}`
      );
    });
    test("get props from separate default function", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: true },
        `function MyComponent({ test }: { test: string }) {return <div />;}; export default MyComponent;`
      );
    });
    test("get props from separate default lambda", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: true },
        `const MyComponent = ({ test }: { test: string }) => {return <div />;}; export default MyComponent;`
      );
    });
    test("get props from separate named function", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `function MyComponent({ test }: { test: string }) {return <div />;}; export { MyComponent };`
      );
    });
    test("get props from separate named lambda", () => {
      matchSnapshotProps(
        { name: "MyComponent", isDefault: false },
        `const MyComponent = ({ test }: { test: string }) => {return <div />;}; export { MyComponent };`
      );
    });
  });
});
