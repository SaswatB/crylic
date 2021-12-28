import { BehaviorSubject } from "rxjs";
import { singleton } from "tsyringe";

import { useObservable } from "../hooks/useObservable";
import { useService } from "../hooks/useService";
import { Project } from "../lib/project/Project";

@singleton()
export class ProjectService {
  public readonly project$ = new BehaviorSubject<Project | undefined>(
    undefined
  );

  constructor() {
    this.project$.subscribe((project) => {
      (window as any).project = project; // only for debugging purposes
    });
  }

  public setProject(project: Project | undefined) {
    this.project$.next(project);
    project?.clearChangeHistory();
  }
}

export function useProject() {
  return useObservable(useService(ProjectService).project$);
}
