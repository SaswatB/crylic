import { BehaviorSubject, Subject } from "rxjs";

import { PluginService } from "../../services/PluginService";
import { ReactMetadata, ViewContext } from "../../types/paint";
import { CodeEntry } from "./CodeEntry";
import { Project } from "./Project";

export enum RenderEntryCompileStatus {
  PENDING,
  IN_PROGRESS,
  COMPILED,
  ERROR,
}

export class RenderEntry {
  public publish = false;
  public readonly domChanged$ = new Subject();
  public readonly viewReloadedStart$ = new Subject();
  public readonly viewReloaded$ = new Subject();
  public readonly reactMetadata$ = new BehaviorSubject<
    ReactMetadata | undefined
  >(undefined);

  public constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly codeEntry: CodeEntry
  ) {}

  public get codeId() {
    return this.codeEntry.id;
  }

  // #region compile tracking
  public readonly compileStatus$ =
    new BehaviorSubject<RenderEntryCompileStatus>(
      RenderEntryCompileStatus.PENDING
    );
  private compileTasks: (() => void)[] = []; // list of tasks to run on compile, cleared on compile or error

  public updateCompileStatus(status: RenderEntryCompileStatus) {
    this.compileStatus$.next(status);

    // process compile tasks
    if (
      [
        RenderEntryCompileStatus.COMPILED,
        RenderEntryCompileStatus.ERROR,
      ].includes(status)
    ) {
      if (status === RenderEntryCompileStatus.COMPILED) {
        this.compileTasks.forEach((task) => task());
      }
      this.compileTasks = [];
    }
  }

  public addCompileTask(task: () => void): void {
    this.compileTasks.push(task);
  }

  public readonly compileProgress$ = new Subject<{
    percentage: number;
    message: string;
  }>();
  // #endregion

  public readonly viewContext$ = new BehaviorSubject<ViewContext | undefined>(
    undefined
  );
  public setViewContext(viewContext: ViewContext) {
    this.viewContext$.next(viewContext);
  }
}

export interface RenderEntryDeployerContext {
  project: Project;
  pluginService: PluginService;
  renderEntry: RenderEntry;
  frame: HTMLIFrameElement | undefined;
  onPublish: (url: string) => void;
}
