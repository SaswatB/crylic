import {
  EditContext,
  ElementASTEditor,
  StyleASTEditor,
  StyleGroup,
} from "../../../lib/ast/editors/ASTEditor";
import { ASTType } from "../../../lib/ast/types";
import { Project } from "../../../lib/project/Project";
import { sleep, takeNext } from "../../../lib/utils";
import { ComponentDefinition, SelectedElement } from "../../../types/paint";
import { AddCompileTask } from "../useCompilerContextRecoil";
import { SelectElement } from "../useSelectRecoil";

interface SelectContext {
  renderId: string;
  addCompileTask: AddCompileTask;
  selectElement: SelectElement;
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
    { ast: await takeNext(codeEntry.ast$), codeEntry, lookupId },
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
        selectElement(renderId, newChildLookupId);
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
  if (typeof targetElement === "string") {
    lookupId = targetElement;
  } else {
    ({ lookupId } = targetElement);
  }
  const editor = project?.primaryElementEditor;
  if (!editor) return;
  const codeId = editor.getCodeIdFromLookupId(lookupId);
  if (!codeId) return;
  const codeEntry = project?.getCodeEntryValue(codeId);
  if (!codeEntry) return;

  // update ast
  const newAst = apply(editor, {
    ast: (await takeNext(codeEntry.ast$)) as T,
    codeEntry,
    lookupId,
  });

  if (selectContext) {
    const { renderId, addCompileTask, selectElement } = selectContext;
    addCompileTask(renderId, () => {
      selectElement(renderId, lookupId);
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
    ast: (await takeNext(codeEntry.ast$)) as T,
    codeEntry,
    lookupId,
  });

  codeEntry.updateAst(newAst);
};
