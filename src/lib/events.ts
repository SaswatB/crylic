import { createEventDefinition, EventBus } from "ts-bus";

import { CodeEntry } from "../types/paint";

export const bus = new EventBus();

export const editorResize = createEventDefinition()("editor.resize");
export const editorOpenLocation = createEventDefinition<{
  codeEntry: CodeEntry;
  line?: number;
}>()("editor.open");
