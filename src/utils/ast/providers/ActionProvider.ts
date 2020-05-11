import { CodeEntry } from "../../../types/paint";
import { Project } from "../../Project";

export interface EditorAction<EditorActionPayload> {
  codeId: string;
  line: number;
  column: number;
  name: string;
  action: EditorActionPayload;
}

interface CodeChanges {
  id: string;
  code: string;
}

export abstract class ActionProvider<EditorActionPayload> {
  public abstract getEditorActions(
    codeEntry: CodeEntry
  ): EditorAction<EditorActionPayload>[];

  public abstract runEditorActionOnAST(
    action: EditorAction<EditorActionPayload>,
    project: Project
  ): CodeChanges[];
}
