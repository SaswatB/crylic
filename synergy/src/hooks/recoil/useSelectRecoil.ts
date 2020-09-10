import { useEffect, useRef } from "react";
import { atom, useRecoilState } from "recoil";

import { SelectMode } from "../../constants";
import {
  EditContext,
  ElementASTEditor,
  StyleGroup,
} from "../../lib/ast/editors/ASTEditor";
import { ASTType } from "../../lib/ast/types";
import { SelectedElement, Styles } from "../../types/paint";
import {
  updateElementHelper,
  updateStyleGroupHelper,
} from "./useProjectRecoil/code-edit-helpers";
import { useProjectRecoil } from "./useProjectRecoil/useProjectRecoil";
import { useCompilerContextRecoil } from "./useCompilerContextRecoil";

const selectModeState = atom<SelectMode | undefined>({
  key: "selectMode",
  default: undefined,
});
const selectedElementState = atom<SelectedElement | undefined>({
  key: "selectedElement",
  default: undefined,
  dangerouslyAllowMutability: true,
});
const selectedStyleGroupState = atom<StyleGroup | undefined>({
  key: "selectedStyleGroup",
  default: undefined,
});

export type SelectElement = (renderId: string, lookupId: string) => void;

export function useSelectRecoil() {
  const { project, setCodeAstEdit } = useProjectRecoil();
  const [selectMode, setSelectMode] = useRecoilState(selectModeState);
  const [selectedElement, setSelectedElement] = useRecoilState(
    selectedElementState
  );
  const [selectedStyleGroup, setSelectedStyleGroup] = useRecoilState(
    selectedStyleGroupState
  );
  // for debugging purposes
  (window as any).selectedElement = selectedElement;

  const { getViewContext, addCompileTask } = useCompilerContextRecoil();

  const selectElement: SelectElement = (renderId, lookupId) => {
    const { getElementsByLookupId } = getViewContext(renderId) || {};
    const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
      lookupId
    );
    if (!codeId) {
      console.log("dropping element select, no code id");
      return;
    }
    const codeEntry = project?.getCodeEntry(codeId);
    if (!codeEntry) {
      console.log("dropping element select, no code entry");
      return;
    }
    const componentElements = getElementsByLookupId?.(lookupId);
    if (!componentElements?.length) {
      console.log("dropping element select, no elements");
      return;
    }

    const styleGroups: StyleGroup[] = [];

    project?.editorEntries.forEach(({ editor }) => {
      styleGroups.push(
        ...editor.getStyleGroupsFromHTMLElement(componentElements[0])
      );
    });

    setSelectedElement({
      renderId,
      lookupId,
      sourceMetadata: project!.primaryElementEditor.getSourceMetaDataFromLookupId(
        { ast: codeEntry.ast, codeEntry },
        lookupId
      ),
      viewContext: getViewContext(renderId),
      element: componentElements[0],
      elements: componentElements,
      styleGroups,
      // todo properly support multiple elements instead of taking the first one
      computedStyles: window.getComputedStyle(componentElements[0]),
      inlineStyles: componentElements[0].style,
    });
    setSelectedStyleGroup(styleGroups[0]);
  };

  const updateSelectedElement = <T extends ASTType>(
    apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T
  ) => {
    if (!selectedElement) return;

    setCodeAstEdit(
      updateElementHelper(selectedElement, apply, {
        // refresh the selected element after compile to get the new ast metadata
        renderId: selectedElement.renderId,
        addCompileTask,
        selectElement,
      })
    );
  };

  const updateSelectedStyleGroup = (styles: Styles, preview?: boolean) => {
    if (!selectedElement) return;

    getViewContext(selectedElement.renderId)?.addTempStyles(
      selectedElement.lookupId,
      styles,
      !preview
    );

    // preview is a flag used to quickly show updates in the dom
    // there shouldn't be any expensive calculations done when it's on
    // such as changing state or parsing ast
    if (preview) return;

    if (!selectedStyleGroup) return;

    setCodeAstEdit(
      updateStyleGroupHelper(selectedStyleGroup, (editor, editContext) =>
        editor.applyStyles(editContext, styles)
      )
    );
  };

  const clearSelectedElement = () => {
    setSelectedElement(undefined);
    setSelectedStyleGroup(undefined);
  };

  return {
    selectMode,
    setSelectMode,
    selectedElement,
    selectElement,
    updateSelectedElement,
    clearSelectedElement,
    selectedStyleGroup,
    updateSelectedStyleGroup,
    setSelectedStyleGroup,
  };
}

export function useReselectGuard() {
  const { selectedElement, selectElement } = useSelectRecoil();

  // there are instances where selected element will have it's underlying dom element replaced
  // so to try and handle such cases, this attempts to reselect the selected element if the parent element is missing
  const badSelectedElementRetryCounter = useRef(0);
  useEffect(() => {
    if (!selectedElement) return;
    if (!selectedElement.element.parentElement) {
      if (badSelectedElementRetryCounter.current === 0) {
        badSelectedElementRetryCounter.current++;
        selectElement(selectedElement.renderId, selectedElement.lookupId);
      }
    } else {
      badSelectedElementRetryCounter.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!selectedElement?.element.parentElement]);
}
