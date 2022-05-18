import { startCase } from "lodash";

import { useTextInput } from "../../../hooks/useInput";
import { ifSelectedElementTarget_Component } from "../../../types/selected-element";
import {
  createElementEditorField,
  ElementEditorFieldProps,
} from "../ElementEditor";

const AttributeNameMap: Record<string, string | undefined> = {
  id: "Identifier",
  href: "Link Target",
};

interface AttributeFEProps extends ElementEditorFieldProps {
  attributeName: string;
}

function useAttributeFE({
  selectedElement,
  attributeName,
  onChangeAttributes,
}: AttributeFEProps) {
  return {
    label:
      AttributeNameMap[attributeName] || startCase(`${attributeName || ""}`),
    initialValue:
      (
        ifSelectedElementTarget_Component(selectedElement)?.target
          .element as HTMLLinkElement
      ).getAttribute(attributeName) ?? undefined,
    onChange: (value: string) => onChangeAttributes({ [attributeName]: value }),
  };
}

// #region text

function TextAttrFE(props: AttributeFEProps & { bindInitialValue?: boolean }) {
  const [, render] = useTextInput(useAttributeFE(props));
  return render();
}
export const creatTextAttrFE = (attributeName: string) =>
  createElementEditorField(TextAttrFE, { attributeName });
export const createBoundTextAttrFE = (attributeName: string) =>
  createElementEditorField(TextAttrFE, {
    attributeName,
    bindInitialValue: true,
  });

// #endregion
