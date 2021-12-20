import { createEventDefinition, EventBus } from "ts-bus";

import { RenderEntry, ViewContext } from "../types/paint";
import { CodeEntry } from "./project/CodeEntry";

export const bus = new EventBus();

export const editorResize = createEventDefinition()("editor.resize");
export const editorOpenLocation = createEventDefinition<{
  codeEntry: CodeEntry;
  line?: number;
}>()("editor.open");

export const componentViewReload = createEventDefinition<{
  renderEntry: RenderEntry;
}>()("componentView.reload");
export const componentViewCompileEnd = createEventDefinition<{
  renderEntry: RenderEntry;
  viewContext: ViewContext;
}>()("componentView.compileEnd");
export const componentViewRouteChange = createEventDefinition<{
  renderEntry: RenderEntry;
  route: string;
}>()("componentView.routeChange");
