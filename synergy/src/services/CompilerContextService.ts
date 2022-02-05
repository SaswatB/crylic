import { singleton } from "tsyringe";

import { ViewContext } from "../types/paint";

@singleton()
export class CompilerContextService {
  private viewContextMap: Record<string, ViewContext | undefined> = {};
  private compileTasks: Record<
    string,
    ((viewContext: ViewContext) => void)[] | undefined
  > = {};

  public getViewContext(renderId: string) {
    return this.viewContextMap[renderId];
  }
  public getAllViewContexts() {
    return this.viewContextMap;
  }
  public setViewContext(renderId: string, viewContext: ViewContext) {
    this.viewContextMap[renderId] = viewContext;
  }

  public addCompileTask(
    renderId: string,
    task: (viewContext: ViewContext) => void
  ) {
    this.compileTasks[renderId] = this.compileTasks[renderId] || [];
    this.compileTasks[renderId]!.push(task);
  }
  public runCompileTasks(renderId: string, viewContext: ViewContext) {
    this.compileTasks[renderId]?.forEach((task) => task(viewContext));
    this.compileTasks[renderId] = [];
  }
}
