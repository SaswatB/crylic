import { BehaviorSubject, Subject } from "rxjs";

import { PluginService } from "../../services/PluginService";
import { OutlineElement, ReactMetadata, ViewContext } from "../../types/paint";
import { buildOutline } from "../outline";
import { throttleAsync } from "../throttle-async";
import { TSTypeW_Object } from "../typer/ts-type-wrapper";
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
  public readonly componentProps$ = new BehaviorSubject<
    Record<string, unknown>
  >({});
  public readonly componentPropsTypes$ = new BehaviorSubject<
    TSTypeW_Object | undefined
  >(undefined);
  public readonly outline$ = new BehaviorSubject<
    | { outline: OutlineElement; treeNodeIdMap: Map<string, OutlineElement> }
    | undefined
  >(undefined);

  public constructor(
    private readonly project: Project,
    public readonly id: string,
    public readonly name: string,
    public readonly codeEntry: CodeEntry
  ) {
    // recalculate the component view outline when the component view compiles, reloads, or changes its route
    this.domChanged$.subscribe(this.refreshOutline);
    this.viewContext$.subscribe(this.refreshOutline);
    this.viewReloaded$.subscribe(this.refreshOutline);
    this.reactMetadata$.subscribe(this.refreshOutline);
    this.compileStatus$.subscribe(
      (c) => c === RenderEntryCompileStatus.COMPILED && this.refreshOutline()
    );
  }

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

  // #region outline

  public refreshOutline = throttleAsync(async () => {
    const rootElement = this.viewContext$.getValue()?.getRootElement();
    if (!rootElement) return;
    console.log("reloading outline");

    // build the outline tree
    const outline =
      (await buildOutline(
        this.project,
        this,
        rootElement,
        this.reactMetadata$.getValue()?.fiberComponentRoot
      )) || [];

    // build a map of tree nodes by id
    const treeNodeIdMap = new Map<string, OutlineElement>();
    function recurse(node: OutlineElement) {
      // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
      while (treeNodeIdMap.has(node.id)) {
        console.error("duplicate node id", node.id, treeNodeIdMap, outline);
        node.id = node.id + "+";
      }
      treeNodeIdMap.set(node.id, node);

      node.children.forEach((c) => recurse(c));
    }
    if (outline) recurse(outline);

    this.outline$.next({ outline, treeNodeIdMap });
  });

  // #endregion
}

export interface RenderEntryDeployerContext {
  project: Project;
  pluginService: PluginService;
  renderEntry: RenderEntry;
  frame: HTMLIFrameElement | undefined;
  onPublish: (url: string) => void;
}
