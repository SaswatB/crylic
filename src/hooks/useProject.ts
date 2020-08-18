import { useRef, useState } from "react";
import { Subject } from "rxjs";

import { Project } from "../lib/project/Project";
import { CodeEntry, PackageInstaller } from "../types/paint";
import { prettyPrintCodeEntryAST } from "../utils/ast/ast-helpers";

export const useProject = () => {
  const [project, setProject] = useState<Project>();
  (window as any).project = project; // only for debugging purposes

  const newProject = (folder: string) =>
    Project.createNewProjectInDirectory(folder).then(setProject);
  const openProject = (folder: string) =>
    Project.createProjectFromDirectory(folder).then(setProject);
  const closeProject = () => setProject(undefined);

  const codeChangeStack = useRef<{ id: string; code: string }[]>([]);
  const codeRedoStack = useRef<{ id: string; code: string }[]>([]);

  const addCodeEntry = (
    partialEntry: Partial<CodeEntry> & { filePath: string },
    options?: { render?: boolean; edit?: boolean }
  ) =>
    setProject((project) => project?.addCodeEntries([partialEntry], options));
  const addRenderEntry = (codeEntry: CodeEntry) =>
    setProject((project) =>
      project?.addRenderEntry(project.getCodeEntry(codeEntry.id)!)
    );

  const setCode = (
    codeId: string,
    code: string,
    isUndo = false,
    isRedo = false
  ) =>
    setProject((currentProject) => {
      const oldCode = currentProject?.getCodeEntry(codeId)?.code;
      if (oldCode === code) return project;

      // keep track of undo/redo state
      if (oldCode !== undefined) {
        const changeEntry = { id: codeId, code: oldCode };
        if (isUndo) {
          // save the old state in the redo stack for undos
          codeRedoStack.current.push(changeEntry);
        } else {
          // save changes in the undo stack
          codeChangeStack.current.push(changeEntry);

          // clear the redo stack if the change isn't an undo or redo
          if (!isRedo) {
            codeRedoStack.current = [];
          }
        }
      }

      // apply change
      return currentProject?.editCodeEntry(codeId, { code });
    });
  const setCodeAstEdit = (editedAst: any, codeEntry: CodeEntry) => {
    if (!project) return;

    // todo use a project ref of something similar to avoid closure issues
    // remove lookup data from the ast and get the transformed code
    project.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
      editedAst = editor.removeLookupData({ ast: editedAst, codeEntry });
    });
    // save the edited code
    setCode(
      codeEntry.id,
      prettyPrintCodeEntryAST(project.config, codeEntry, editedAst)
    );
  };
  const toggleCodeEntryEdit = (codeEntry: CodeEntry) =>
    setProject((currentProject) => {
      if (currentProject?.editEntries.find((e) => e.codeId === codeEntry.id))
        return currentProject.removeEditEntry(codeEntry);
      return currentProject?.addEditEntry(codeEntry);
    });

  const undoCodeChange = () => {
    const change = codeChangeStack.current.pop();
    console.log("undo", change);
    if (change) {
      setCode(change.id, change.code, true);
    }
  };
  const redoCodeChange = () => {
    const change = codeRedoStack.current.pop();
    console.log("redo", change);
    if (change) {
      setCode(change.id, change.code, false, true);
    }
  };

  const [installingPackages, setInstallingPackages] = useState(false);
  // todo handle input?
  const installPackagesOutputRef = useRef(new Subject<Buffer>());
  const installPackages: PackageInstaller = (packageName, devDep) => {
    if (!project) return;
    setInstallingPackages(true);
    const childProcess = project.config
      .getPackageManager()
      .installPackage(packageName, devDep);
    childProcess.stdout?.on("data", (chunk) =>
      installPackagesOutputRef.current.next(chunk)
    );
    childProcess.stderr?.on("data", (chunk) =>
      installPackagesOutputRef.current.next(chunk)
    );
    childProcess.on("exit", () => {
      setInstallingPackages(false);
      setProject((project) => project?.refreshConfig());
    });
  };

  return {
    project,
    setProject,
    newProject,
    openProject,
    closeProject,
    undoCodeChange,
    redoCodeChange,
    addCodeEntry,
    setCode,
    setCodeAstEdit,
    toggleCodeEntryEdit,
    addRenderEntry,
    installPackages,
    installingPackages,
    installPackagesOutput: installPackagesOutputRef.current,
  };
};
