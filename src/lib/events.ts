import { createEventDefinition, EventBus } from "ts-bus";

export const bus = new EventBus();

export const editorResize = createEventDefinition()("editor.resize");
