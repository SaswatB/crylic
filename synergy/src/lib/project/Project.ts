import { uniqueId } from "lodash";
import { BehaviorSubject, Subject } from "rxjs";
import { bufferCount, distinctUntilChanged, map } from "rxjs/operators";

import { EditEntry } from "../../types/paint";
import { ElementASTEditor, StyleASTEditor } from "../ast/editors/ASTEditor";
import { JSXASTEditor } from "../ast/editors/JSXASTEditor";
import { StyledASTEditor } from "../ast/editors/StyledASTEditor";
import { StyleSheetASTEditor } from "../ast/editors/StyleSheetASTEditor";
import { LTBehaviorSubject } from "../lightObservable/LTBehaviorSubject";
import { ltMap } from "../lightObservable/LTOperator";
import { eagerMapArrayAny } from "../rxjs/eagerMap";
import { produceNext } from "../utils";
import { CodeEntry } from "./CodeEntry";
import { PortablePath } from "./PortablePath";
import { ProjectConfig } from "./ProjectConfig";
import { RenderEntry } from "./RenderEntry";

type EditorEntry<T> = {
  shouldApply: (entry: CodeEntry) => boolean;
  editor: T;
};

export abstract class Project {
  public readonly codeEntries$ = new LTBehaviorSubject<CodeEntry[]>([]); // lm_9dfd4feb9b entries cannot be removed
  public readonly editEntries$ = new BehaviorSubject<EditEntry[]>([]);
  public readonly renderEntries$ = new BehaviorSubject<RenderEntry[]>([]);
  public readonly shouldReloadRenderEntries$ = new Subject();
  public readonly projectSaved$ = new Subject();
  private readonly elementEditorEntries: EditorEntry<ElementASTEditor<any>>[];
  private readonly styleEditorEntries: EditorEntry<StyleASTEditor<any>>[];

  protected constructor(
    public readonly path: PortablePath,
    public config: ProjectConfig
  ) {
    this.elementEditorEntries = [
      {
        editor: new JSXASTEditor({
          styledComponentsImport: config.getStyledComponentsImport(),
        }),
        shouldApply: (e) => e.isScriptEntry,
      },
    ];
    this.styleEditorEntries = [
      { editor: new StyledASTEditor(), shouldApply: (e) => e.isScriptEntry },
      { editor: new StyleSheetASTEditor(), shouldApply: (e) => e.isStyleEntry },
    ];
    this.initUndoRedo();
  }

  public abstract saveFiles(): void;
  public abstract saveFile(codeEntry: CodeEntry): void;
  public abstract addAsset(source: PortablePath): void;
  public abstract refreshConfig(): void;

  public onClose() {}

  public get editorEntries() {
    return [...this.elementEditorEntries, ...this.styleEditorEntries];
  }

  public get primaryElementEditor() {
    return this.elementEditorEntries[0]!.editor;
  }

  // #region code entries

  public getEditorsForCodeEntry(codeEntry: CodeEntry) {
    return this.editorEntries
      .filter(({ shouldApply }) => shouldApply(codeEntry))
      .map(({ editor }) => editor);
  }

  public getCodeEntry(codeId: string) {
    return this.codeEntries$.pipe(
      ltMap((entries) => entries.find(({ id }) => id === codeId))
    );
  }

  public getCodeEntryValue(codeId: string) {
    return this.codeEntries$.getValue().find(({ id }) => id === codeId);
  }

  public addCodeEntries(
    entries: CodeEntry[],
    options?: { render?: boolean; edit?: boolean }
  ) {
    produceNext(this.codeEntries$, (draft) => draft.push(...entries));

    // if these code entries are edited/rendered by default, add those respective entries
    if (options?.edit) this.addEditEntries(...entries);
    if (options?.render) this.addRenderEntries(...entries);
  }

  // #endregion

  // #region undo/redo

  protected codeChangeStacks = {
    prev: [] as { codeEntry: CodeEntry; code: string }[],
    next: [] as { codeEntry: CodeEntry; code: string }[],
    // CodeEntry.updateCode doesn't have any metadata that indicates that
    // a code update was by the user or for an undo/redo, this keeps track
    // externally and depends on lm_d1c6d7683b
    queuedAction: undefined as "undo" | "redo" | undefined,
  };
  protected initUndoRedo() {
    this.codeEntries$
      .toRXJS()
      .pipe(
        eagerMapArrayAny((codeEntry) =>
          codeEntry.code$.toRXJS().pipe(
            distinctUntilChanged(),
            bufferCount(2, 1),
            map(([oldCode, newCode]) => ({ codeEntry, oldCode, newCode }))
          )
        )
      )
      .subscribe((change) => {
        const { codeEntry, oldCode, newCode } = change || {};

        if (!codeEntry || oldCode === undefined || newCode === undefined) {
          return;
        }

        // check whether there are any changes
        if (oldCode === newCode) return;

        // keep track of undo/redo state
        const changeEntry = { codeEntry, code: oldCode };
        if (this.codeChangeStacks.queuedAction === "undo") {
          // save the old state in the redo stack for undos
          this.codeChangeStacks.next.push(changeEntry);
        } else {
          // save changes in the undo stack
          this.codeChangeStacks.prev.push(changeEntry);

          // clear the redo stack if the change isn't an undo or redo
          if (this.codeChangeStacks.queuedAction !== "redo") {
            this.codeChangeStacks.next = [];
          }
        }
      });
  }

  public undoCodeChange() {
    const change = this.codeChangeStacks.prev.pop();
    console.log("undo", change);
    if (change) {
      this.codeChangeStacks.queuedAction = "undo";
      // lm_d1c6d7683b this is assumed to be synchronous
      change.codeEntry.updateCode(change.code);
      this.codeChangeStacks.queuedAction = undefined;
    }
  }
  public redoCodeChange() {
    const change = this.codeChangeStacks.next.pop();
    console.log("redo", change);
    if (change) {
      this.codeChangeStacks.queuedAction = "redo";
      // lm_d1c6d7683b this is assumed to be synchronous
      change.codeEntry.updateCode(change.code);
      this.codeChangeStacks.queuedAction = undefined;
    }
  }

  public clearChangeHistory() {
    this.codeChangeStacks.prev = [];
    this.codeChangeStacks.next = [];
  }

  // #endregion

  // #region edit & render entries

  public addEditEntries(...codeEntries: CodeEntry[]) {
    const newEditEntries = codeEntries.map((entry) => ({
      codeId: entry.id,
    }));
    produceNext(this.editEntries$, (draft) => draft.push(...newEditEntries));
  }

  public removeEditEntry(codeEntry: CodeEntry) {
    produceNext(this.editEntries$, (draft) => {
      const index = draft.findIndex((entry) => entry.codeId === codeEntry.id);
      if (index === -1) {
        console.trace("removeEditEntry: code entry not found", {
          codeId: codeEntry.id,
        });
        return;
      }

      draft.splice(index, 1);
    });
  }

  public toggleEditEntry(codeEntry: CodeEntry) {
    if (this.editEntries$.getValue().find((e) => e.codeId === codeEntry.id))
      this.removeEditEntry(codeEntry);
    else this.addEditEntries(codeEntry);
  }

  public addRenderEntries(...codeEntries: CodeEntry[]) {
    const newRenderEntries: RenderEntry[] = [];
    codeEntries.forEach((codeEntry) => {
      let baseName = codeEntry.friendlyName;
      const name = { current: baseName };
      let index = 1;
      while (
        [...this.renderEntries$.getValue(), ...newRenderEntries].find(
          (renderEntry) => renderEntry.name === name.current
        )
      ) {
        name.current = `${baseName} (${index++})`;
      }

      newRenderEntries.push(
        new RenderEntry(uniqueId(), name.current, codeEntry)
      );
    });
    produceNext(this.renderEntries$, (draft) =>
      (draft as RenderEntry[]).push(...newRenderEntries)
    );
  }

  public removeRenderEntry(renderId: string) {
    produceNext(this.renderEntries$, (draft) => {
      const index = draft.findIndex((entry) => entry.id === renderId);
      if (index === -1) {
        console.trace("removeRenderEntry: render entry not found", {
          renderId,
        });
        return;
      }

      draft.splice(index, 1);
    });
  }

  public refreshRenderEntries() {
    this.shouldReloadRenderEntries$.next();
  }

  // #endregion
}
