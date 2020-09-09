import { MutableRefObject } from "react";
import { atom, useRecoilState } from "recoil";

import { Project } from "../../../lib/project/Project";

const codeChangeStacksState = atom<
  MutableRefObject<{
    prev: { id: string; code: string }[];
    next: { id: string; code: string }[];
  }>
>({
  key: "codeChangeStacks",
  default: { current: { prev: [], next: [] } },
});

export function useCodeChangeStack(
  setProject: (
    apply: (project: Project | undefined) => Project | undefined
  ) => void
) {
  const [codeChangeStacksRef] = useRecoilState(codeChangeStacksState);

  const setCode = (
    getCode: (project: Project) => { id: string; code: string } | undefined,
    isUndo = false,
    isRedo = false
  ) =>
    setProject((currentProject) => {
      if (!currentProject) {
        console.log("edit on undefined project");
        return;
      }

      // get the new code
      const change = getCode(currentProject);
      if (change === undefined) return currentProject;
      const { id: codeId, code } = change;

      // check whether there are any changes
      const oldCode = currentProject.getCodeEntry(codeId)?.code;
      if (oldCode === code) return currentProject;

      // keep track of undo/redo state
      if (oldCode !== undefined) {
        const changeEntry = { id: codeId, code: oldCode };
        if (isUndo) {
          // save the old state in the redo stack for undos
          codeChangeStacksRef.current.next.push(changeEntry);
        } else {
          // save changes in the undo stack
          codeChangeStacksRef.current.prev.push(changeEntry);

          // clear the redo stack if the change isn't an undo or redo
          if (!isRedo) {
            codeChangeStacksRef.current.next = [];
          }
        }
      }

      // apply change
      return currentProject.editCodeEntry(codeId, { code });
    });

  const undoCodeChange = () => {
    const change = codeChangeStacksRef.current.prev.pop();
    console.log("undo", change);
    if (change) setCode(() => change, true);
  };
  const redoCodeChange = () => {
    const change = codeChangeStacksRef.current.next.pop();
    console.log("redo", change);
    if (change) setCode(() => change, false, true);
  };

  const clearChangeHistory = () => {
    codeChangeStacksRef.current.prev = [];
    codeChangeStacksRef.current.next = [];
  };

  return { setCode, undoCodeChange, redoCodeChange, clearChangeHistory };
}
