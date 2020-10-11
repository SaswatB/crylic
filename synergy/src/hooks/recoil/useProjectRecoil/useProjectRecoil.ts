import { atom, useRecoilState } from "recoil";

import { prettyPrintCodeEntryAST } from "../../../lib/ast/ast-helpers";
import { ASTType } from "../../../lib/ast/types";
import { Project } from "../../../lib/project/Project";
import { CodeEntry } from "../../../types/paint";
import { useCodeChangeStack } from "./useCodeChangeStack";

const projectState = atom<Project | undefined>({
  key: "project",
  default: undefined,
});

export type SetCodeAstEdit = (
  editAst: (project: Project) => { entry: CodeEntry; ast: ASTType } | undefined
) => void;

export function useProjectRecoil() {
  const [project, setProject] = useRecoilState(projectState);
  (window as any).project = project; // only for debugging purposes

  // funnel code changes through a tracker for undo/redo
  const {
    setCode,
    undoCodeChange,
    redoCodeChange,
    clearChangeHistory,
  } = useCodeChangeStack(setProject);

  const resetProject = (project?: Project) => {
    setProject(project);
    clearChangeHistory();
  };

  const addCodeEntry = (
    partialEntry: Partial<CodeEntry> & { filePath: string },
    options?: { render?: boolean; edit?: boolean }
  ) =>
    setProject((project) => project?.addCodeEntries([partialEntry], options));
  const addRenderEntry = (codeEntry: CodeEntry) =>
    setProject((project) =>
      project?.addRenderEntry(project.getCodeEntry(codeEntry.id)!)
    );
  const toggleCodeEntryEdit = (codeEntry: CodeEntry) =>
    setProject((currentProject) => {
      if (currentProject?.editEntries.find((e) => e.codeId === codeEntry.id))
        return currentProject.removeEditEntry(codeEntry);
      return currentProject?.addEditEntry(codeEntry);
    });

  const setCodeAstEdit: SetCodeAstEdit = (editAst) =>
    setCode((project) => {
      // get the ast edit
      let change = editAst(project);
      if (change === undefined) return undefined;
      let { entry: codeEntry, ast: editedAst } = change;

      // remove lookup data from the ast and get the transformed code
      project.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
        editedAst = editor.removeLookupData({ ast: editedAst, codeEntry });
      });
      // save the edited code
      return {
        id: codeEntry.id,
        code: prettyPrintCodeEntryAST(project.config, codeEntry, editedAst),
      };
    });

  return {
    project,
    setProject,
    initProject: (project: Project) => resetProject(project),
    closeProject: () => resetProject(),
    undoCodeChange,
    redoCodeChange,
    addCodeEntry,
    setCode,
    setCodeAstEdit,
    toggleCodeEntryEdit,
    addRenderEntry,
  };
}
