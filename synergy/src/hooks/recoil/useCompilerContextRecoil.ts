import { MutableRefObject } from "react";
import { atom, useRecoilState } from "recoil";

import { ViewContext } from "../../types/paint";

const viewContextMapState = atom<
  MutableRefObject<Record<string, ViewContext | undefined>>
>({
  key: "viewContextMap",
  default: { current: {} },
});

const compileTasksState = atom<
  MutableRefObject<
    Record<string, ((viewContext: ViewContext) => void)[] | undefined>
  >
>({
  key: "compileTasks",
  default: { current: {} },
});

export type AddCompileTask = (
  renderId: string,
  task: (viewContext: ViewContext) => void
) => void;

export function useCompilerContextRecoil() {
  const [viewContextMapRef] = useRecoilState(viewContextMapState);
  const getViewContext = (renderId: string) =>
    viewContextMapRef.current[renderId];
  const setViewContext = (renderId: string, viewContext: ViewContext) =>
    (viewContextMapRef.current[renderId] = viewContext);

  const [compileTasksRef] = useRecoilState(compileTasksState);
  const addCompileTask: AddCompileTask = (renderId, task) => {
    compileTasksRef.current[renderId] = compileTasksRef.current[renderId] || [];
    compileTasksRef.current[renderId]!.push(task);
  };
  const runCompileTasks = (renderId: string, viewContext: ViewContext) => {
    compileTasksRef.current[renderId]?.forEach((task) => task(viewContext));
  };

  return {
    getViewContext,
    setViewContext,
    addCompileTask,
    runCompileTasks,
  };
}
