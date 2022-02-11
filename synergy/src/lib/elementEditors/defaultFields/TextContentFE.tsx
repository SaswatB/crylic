import { useDebouncedFunction } from "../../../hooks/useDebouncedFunction";
import { useTextInput } from "../../../hooks/useInput";
import { useService } from "../../../hooks/useService";
import { SelectService } from "../../../services/SelectService";
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
      selectedElement.element.textContent = newTextContent;
      updateSelectedElementDebounced((editor, editContext) =>
        editor.updateElementText(editContext, newTextContent)
      );
    },
    label: "Text Content",
    initialValue: selectedElement.element.textContent ?? undefined,
    bindInitialValue: true,
  });

  return renderTextContentInput({
    className: "col-span-2",
    autoFocus: true,
    multiline: true,
  });
}
