import { createEventDefinition, EventBus } from "ts-bus";

import { CodeEntry } from "./project/CodeEntry";

export const bus = new EventBus();

export const editorResize = createEventDefinition()("editor.resize");
export const editorOpenLocation = createEventDefinition<{
  codeEntry: CodeEntry;
  line?: number;
}>()("editor.open");
