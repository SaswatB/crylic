import { BehaviorSubject } from "rxjs";
import { singleton } from "tsyringe";

import { useObservable } from "../hooks/useObservable";
import { useService } from "../hooks/useService";
import { Project } from "../lib/project/Project";

const RECENT_PROJECTS_KEY = "recentProjects";

export interface RecentProjectEntry {
  filePath: string;
}

@singleton()
export class ProjectService {
  public readonly project$ = new BehaviorSubject<Project | undefined>(
    undefined
  );

  constructor() {
    this.project$.subscribe((project) => {
      (window as any).project = project; // only for debugging purposes

      // save recent projects, with this latest project on top
      if (project) {
        localStorage.setItem(
          RECENT_PROJECTS_KEY,
          JSON.stringify([
            { filePath: project.path },
            ...this.getRecentProjects().filter(
              (e) => e.filePath !== project.path
            ),
          ])
        );
      }
    });
  }

  public setProject(project: Project | undefined) {
    this.project$.next(project);
    project?.clearChangeHistory();
  }

  public getRecentProjects(): RecentProjectEntry[] {
    try {
      return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || "[]");
    } catch (e) {}
    return [];
  }
}

export function useProject(): Project;
export function useProject<T extends true | false>(options: {
  allowUndefined?: T;
}): T extends true ? Project | undefined : Project;
export function useProject<T extends true | false>(options?: {
  allowUndefined?: T;
}): T extends true ? Project | undefined : Project {
  const project = useObservable(useService(ProjectService).project$);
  if (!project && !options?.allowUndefined) throw new Error("No project");

  return project as T extends true ? Project | undefined : Project;
}
