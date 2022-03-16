import { SelectModeHints } from "../../constants";
import { ComponentDefinition } from "../../types/paint";
import { SelectedElement } from "../../types/selected-element";
import { Project } from "../project/Project";
import { RenderEntry } from "../project/RenderEntry";
import { sleep } from "../utils";
import {
  createNewEditContext,
  EditContext,
  ElementASTEditor,
  StyleASTEditor,
  StyleGroup,
} from "./editors/ASTEditor";
import { ASTType } from "./types";

interface SelectContext {
  renderEntry: RenderEntry;
  selectElement: (
    renderEntry: RenderEntry,
    selector: { lookupId: string; index: number }
  ) => void;
}

export const addElementHelper = async (
  project: Project,
  targetElement: HTMLElement | string, // element or lookupId
  component: ComponentDefinition,
  hints?: SelectModeHints,
  // set this to select the newly added element when it appears
  selectContext?: SelectContext
) => {
  let lookupId;
  if (typeof targetElement === "string") {
    lookupId = targetElement;
  } else {
    lookupId = project.primaryElementEditor.getLookupIdFromHTMLElement(
      targetElement
    );
    if (!lookupId) return;
  }

  const codeId = project.primaryElementEditor.getCodeIdFromLookupId(lookupId);
  if (!codeId) return;

  const codeEntry = project.codeEntries$
    .getValue()
    .find((e) => e.id === codeId);
  if (!codeEntry) return;

  const componentPath =
    !component.isHTMLElement && component.component.import.path;

  // don't allow adding a component to itself
  if (componentPath === codeEntry.filePath) {
    throw new Error("Cannot add a component as a child of itself");
  }

  let newAst = project.primaryElementEditor.addChildToElement(
    { ast: await codeEntry.getLatestAst(), codeEntry, lookupId },
    component,
    hints?.beforeChildLookupId
  );
  const [newChildLookupId] =
    project.primaryElementEditor.getRecentlyAddedElements({
      ast: newAst,
      codeEntry,
    }) || [];

  if (newChildLookupId !== undefined && selectContext) {
    // try to select the newly added element when the CompilerComponentView next compiles
    const { renderEntry, selectElement } = selectContext;
    renderEntry.addCompileTask(async () => {
      let newChildComponent = undefined;
      for (let i = 0; i < 5 && !newChildComponent; i++) {
        newChildComponent = renderEntry.viewContext$
          .getValue()
          ?.getElementsByLookupId(newChildLookupId)[0];
        if (!newChildComponent) await sleep(100);
      }
      if (newChildComponent) {
        console.log(
          "setting selected element through post-child add",
          newChildLookupId
        );
        selectElement(renderEntry, { lookupId: newChildLookupId, index: 0 });
      }
    });
  }

  await codeEntry.updateAst(newAst);
};

export const updateElementHelper = async <T extends ASTType>(
  project: Project,
  targetElement: SelectedElement | string, // element or lookupId
  apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T,
  // set this to select the updated element after compile
  selectContext?: SelectContext
) => {
  let lookupId: string;
  let index: number;
  if (typeof targetElement === "string") {
    lookupId = targetElement;
    index = 0;
  } else {
    ({ lookupId, index } = targetElement);
  }
  const editor = project?.primaryElementEditor;
  if (!editor) return;
  const codeId = editor.getCodeIdFromLookupId(lookupId);
  if (!codeId) return;
  const codeEntry = project?.getCodeEntryValue(codeId);
  if (!codeEntry) return;

  // update ast
  const newAst = apply(editor, await createNewEditContext(codeEntry, lookupId));

  if (selectContext) {
    const { renderEntry, selectElement } = selectContext;
    renderEntry.addCompileTask(() =>
      selectElement(renderEntry, { lookupId, index })
    );
  }

  await codeEntry.updateAst(newAst);
};

export const updateStyleGroupHelper = async <T extends ASTType>(
  project: Project,
  styleGroup: StyleGroup,
  apply: (editor: StyleASTEditor<T>, editContext: EditContext<T>) => T
) => {
  // gather prerequisites
  const { editor, lookupId } = styleGroup;
  const codeId = editor.getCodeIdFromLookupId(lookupId);
  if (!codeId) return;
  const codeEntry = project.getCodeEntryValue(codeId);
  if (!codeEntry) return;

  // update ast
  const newAst = apply(editor, await createNewEditContext(codeEntry, lookupId));

  await codeEntry.updateAst(newAst);
};
