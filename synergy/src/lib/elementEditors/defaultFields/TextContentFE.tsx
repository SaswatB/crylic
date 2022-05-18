import { useDebouncedFunction } from "../../../hooks/useDebouncedFunction";
import { useTextInput } from "../../../hooks/useInput";
import { useService } from "../../../hooks/useService";
import { SelectService } from "../../../services/SelectService";
import {
  ifSelectedElementTarget_Component,
  isSelectedElementTarget_Component,
} from "../../../types/selected-element";
import { ElementEditorFieldProps } from "../ElementEditor";

export function TextContentFE({ selectedElement }: ElementEditorFieldProps) {
  const selectService = useService(SelectService);

  // debounce text entry
  const updateSelectedElementDebounced = useDebouncedFunction(
    selectService.updateSelectedElement.bind(selectService),
    1000
  );

  const [, renderTextContentInput] = useTextInput({
    onChange: (newTextContent) => {
      if (!isSelectedElementTarget_Component(selectedElement)) return;
      selectedElement.target.element.textContent = newTextContent;
      updateSelectedElementDebounced((editor, editContext) =>
        editor.updateElementText(editContext, newTextContent)
      );
    },
    label: "Text Content",
    initialValue:
      ifSelectedElementTarget_Component(selectedElement)?.target.element
        .textContent ?? undefined,
    bindInitialValue: true,
  });

  return renderTextContentInput({
    className: "col-span-2",
    autoFocus: true,
    multiline: true,
  });
}
