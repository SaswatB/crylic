import {
  EditContext,
  ElementASTEditor,
  StyleASTEditor,
  StyleGroup,
} from "../../../lib/ast/editors/ASTEditor";
import { ASTType } from "../../../lib/ast/types";
import { Project } from "../../../lib/project/Project";
import { sleep } from "../../../lib/utils";
import { ComponentDefinition, SelectedElement } from "../../../types/paint";
import { AddCompileTask } from "../useCompilerContextRecoil";
import { SelectElement } from "../useSelectRecoil";

interface SelectContext {
  renderId: string;
  addCompileTask: AddCompileTask;
  selectElement: SelectElement;
}

export const addElementHelper = (
  targetElement: HTMLElement | string, // element or lookupId
  component: ComponentDefinition,
  // set this to select the newly added element when it appears
  selectContext?: SelectContext
) => (project: Project) => {
  let lookupId;
  if (typeof targetElement === "string") {
    lookupId = targetElement;
  } else {
    lookupId = project.primaryElementEditor.getLookupIdFromHTMLElement(
      targetElement
    );
    if (!lookupId) return undefined;
  }

  const codeId = project.primaryElementEditor.getCodeIdFromLookupId(lookupId);
  if (!codeId) return undefined;

  const codeEntry = project.codeEntries.find(
    (codeEntry) => codeEntry.id === codeId
  );
  if (!codeEntry) return undefined;

  const componentPath =
    !component.isHTMLElement && component.component.import.path;

  // don't allow adding a component to itself
  if (componentPath === codeEntry.filePath) {
    throw new Error("Cannot add a component as a child of itself");
  }

  let newAst = project.primaryElementEditor.addChildToElement(
    { ast: codeEntry.ast, codeEntry, lookupId },
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
        newChildComponent = getElementsByLookupId(newChildLookupId!)[0];
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

  return { entry: codeEntry, ast: newAst };
};

export const updateElementHelper = <T extends ASTType>(
  targetElement: SelectedElement | string, // element or lookupId
  apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T,
  // set this to select the updated element after compile
  selectContext?: SelectContext
) => (project: Project) => {
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
  const codeEntry = project?.getCodeEntry(codeId);
  if (!codeEntry) return;

  // update ast
  const newAst = apply(editor, { ast: codeEntry.ast, codeEntry, lookupId });

  if (selectContext) {
    const { renderId, addCompileTask, selectElement } = selectContext;
    addCompileTask(renderId, () => {
      selectElement(renderId, lookupId);
    });
  }

  return { entry: codeEntry, ast: newAst };
};

export const updateStyleGroupHelper = <T extends ASTType>(
  styleGroup: StyleGroup,
  apply: (editor: StyleASTEditor<T>, editContext: EditContext<T>) => T
) => (project: Project) => {
  // gather prerequisites
  const { editor, lookupId } = styleGroup;
  const codeId = editor.getCodeIdFromLookupId(lookupId);
  if (!codeId) return;
  const codeEntry = project?.getCodeEntry(codeId);
  if (!codeEntry) return;

  // update ast
  const newAst = apply(editor, { ast: codeEntry.ast, codeEntry, lookupId });

  return { entry: codeEntry, ast: newAst };
};
