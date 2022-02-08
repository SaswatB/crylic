import {
  ComponentDefinition,
  SelectedElement,
  ViewContext,
} from "../../types/paint";
import { Project } from "../project/Project";
import { ltTakeNext, sleep } from "../utils";
import {
  EditContext,
  ElementASTEditor,
  StyleASTEditor,
  StyleGroup,
} from "./editors/ASTEditor";
import { ASTType } from "./types";

interface SelectContext {
  renderId: string;
  addCompileTask: (
    renderId: string,
    task: (viewContext: ViewContext) => void
  ) => void;
  selectElement: (
    renderId: string,
    selector: { lookupId: string; index: number }
  ) => void;
}

export const addElementHelper = async (
  project: Project,
  targetElement: HTMLElement | string, // element or lookupId
  component: ComponentDefinition,
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
    component
  );
  const [newChildLookupId] =
    project.primaryElementEditor.getRecentlyAddedElements({
      ast: newAst,
      codeEntry,
    }) || [];

  if (newChildLookupId !== undefined && selectContext) {
    // try to select the newly added element when the CompilerComponentView next compiles
    const { renderId, addCompileTask, selectElement } = selectContext;
    addCompileTask(renderId, async ({ getElementsByLookupId }) => {
      let newChildComponent = undefined;
      for (let i = 0; i < 5 && !newChildComponent; i++) {
        newChildComponent = getElementsByLookupId(newChildLookupId)[0];
        if (!newChildComponent) await sleep(100);
      }
      if (newChildComponent) {
        console.log(
          "setting selected element through post-child add",
          newChildLookupId
        );
        selectElement(renderId, { lookupId: newChildLookupId, index: 0 });
      }
    });
  }

  codeEntry.updateAst(newAst);
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
  const newAst = apply(editor, {
    ast: (await codeEntry.getLatestAst()) as T,
    codeEntry,
    lookupId,
  });

  if (selectContext) {
    const { renderId, addCompileTask, selectElement } = selectContext;
    addCompileTask(renderId, () => {
      selectElement(renderId, { lookupId, index });
    });
  }

  codeEntry.updateAst(newAst);
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
  const newAst = apply(editor, {
    ast: (await codeEntry.getLatestAst()) as T,
    codeEntry,
    lookupId,
  });

  codeEntry.updateAst(newAst);
};
