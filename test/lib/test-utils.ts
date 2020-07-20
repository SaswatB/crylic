import { namedTypes as t } from "ast-types";
import { CSSASTNode } from "gonzales-pe";

import { CodeEntry } from "../../src/types/paint";
import {
  parseCodeEntryAST,
  prettyPrintCodeEntryAST,
} from "../../src/utils/ast/ast-helpers";
import { ASTEditor } from "../../src/utils/ast/editors/ASTEditor";

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
  return prettyPrintCodeEntryAST(codeEntry, ast);
};
