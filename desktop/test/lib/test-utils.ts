import { namedTypes as t } from "ast-types";
import { CSSASTNode } from "gonzales-pe";

import {
  parseCodeEntryAST,
  prettyPrintCodeEntryAST,
} from "synergy/src/lib/ast/ast-helpers";
import { ASTEditor } from "synergy/src/lib/ast/editors/ASTEditor";
import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { ProjectConfigFile } from "synergy/src/lib/project/ProjectConfig";
import { PackageJson } from "synergy/src/types/paint";

import { FilePortablePath } from "../../src/lib/project/FilePortablePath";
import { FileProject } from "../../src/lib/project/FileProject";
import { FileProjectConfig } from "../../src/lib/project/FileProjectConfig";

class TestProjectConfig extends FileProjectConfig {
  public constructor(
    configFile: ProjectConfigFile = {},
    packageJson: PackageJson | undefined = undefined
  ) {
    super(new FilePortablePath(""), configFile, packageJson);
  }
}

export class TestProject extends FileProject {
  public constructor(config = new TestProjectConfig()) {
    super(new FilePortablePath(""), config, () => config);
  }
}

export type runEditorApply<T, S> = (arg: {
  editor: T;
  ast: S;
  codeEntry: CodeEntry;
  lookupIds: string[];
}) => S;

export const runEditor = <
  S extends t.File | CSSASTNode,
  T extends ASTEditor<S>
>(
  editor: T,
  code: string,
  codeExtension: string,
  apply: runEditorApply<T, S>
) => {
  const config = new TestProjectConfig();
  const codeEntry = new CodeEntry(
    new TestProject(config),
    new FilePortablePath(`/file.${codeExtension}`),
    code,
    0
  );
  let ast: S = parseCodeEntryAST(codeEntry.getRemoteCodeEntry()) as S;
  let lookupIds;
  ({ ast, lookupIds } = editor.addLookupData({
    ast: ast,
    codeEntry,
  }));
  ast = apply({ editor, ast, codeEntry, lookupIds });
  ast = editor.removeLookupData({ ast, codeEntry });
  return prettyPrintCodeEntryAST(
    config,
    codeEntry.getRemoteCodeEntry(),
    ast
  ).replaceAll("\r", "");
};

export function debugPipe(start: any, ...parts: Function[]) {
  let current = start;
  const id = `${Math.random().toString(36).substring(4)}`;
  console.log(`debugPipe(${id}): start - `, start);
  for (const part of parts) {
    current = part(current);
    console.log(`debugPipe(${id}): part ${part.toString()} - `, current);
  }
  return current;
}
