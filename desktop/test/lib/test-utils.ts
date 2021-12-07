import { namedTypes as t } from "ast-types";
import { CSSASTNode } from "gonzales-pe";

import {
  parseCodeEntryAST,
  prettyPrintCodeEntryAST,
} from "synergy/src/lib/ast/ast-helpers";
import { ASTEditor } from "synergy/src/lib/ast/editors/ASTEditor";
import { ProjectConfigFile } from "synergy/src/lib/project/ProjectConfig";
import { PackageJson, CodeEntry } from "synergy/src/types/paint";

import { FileProject } from "../../src/lib/project/FileProject";
import { FileProjectConfig } from "../../src/lib/project/FileProjectConfig";

class TestProjectConfig extends FileProjectConfig {
  public constructor(
    configFile: ProjectConfigFile | undefined = undefined,
    packageJson: PackageJson | undefined = undefined
  ) {
    super("", configFile, packageJson);
  }
}

export class TestProject extends FileProject {
  public constructor(config = new TestProjectConfig()) {
    super("", "", config);
  }
  public override getCodeEntryMetaData(codeEntry: CodeEntry) {
    return super.getCodeEntryMetaData(codeEntry);
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
  const codeEntry: CodeEntry = {
    id: "0",
    filePath: `/file.${codeExtension}`,
    code,
    codeRevisionId: 0,
  };
  let ast: S = parseCodeEntryAST(codeEntry) as S;
  let lookupIds;
  ({ ast, lookupIds } = editor.addLookupData({
    ast: ast,
    codeEntry,
  }));
  ast = apply({ editor, ast, codeEntry, lookupIds });
  ast = editor.removeLookupData({ ast, codeEntry });
  return prettyPrintCodeEntryAST(new TestProjectConfig(), codeEntry, ast);
};
