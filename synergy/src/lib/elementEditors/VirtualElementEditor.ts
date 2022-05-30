import { groupBy } from "lodash";

import {
  isSelectedElementTarget_Component,
  SelectedElement,
  SelectedElementTargetType,
} from "../../types/selected-element";
import { TSTypeW_Object } from "../typer/ts-type-wrapper";
import { createMessageFE } from "./virtualFields/MessageFE";
import { createVirtualPropFE } from "./virtualFields/VirtualPropFEs";
import { ElementEditor, ElementEditorSection } from "./ElementEditor";

export class VirtualElementEditor implements ElementEditor {
  canApply(selectedElement: SelectedElement): number {
    if (isSelectedElementTarget_Component(selectedElement)) return 0;
    return selectedElement.target.type ===
      SelectedElementTargetType.RenderEntry ||
      (selectedElement.target.propTypes?.props.length || 0) > 0
      ? 10
      : 1;
  }

  getEditorSections(selectedElement: SelectedElement): ElementEditorSection[] {
    let propTypes: TSTypeW_Object | undefined = undefined;
    if (selectedElement.target.type === SelectedElementTargetType.RenderEntry) {
      propTypes = selectedElement.renderEntry.componentPropsTypes$.getValue();
    } else {
      propTypes = selectedElement.target.propTypes;
    }
    const sections: ElementEditorSection[] = Object.entries(
      groupBy(propTypes?.props || [], (p) => p.parentTypeName || "Props")
    ).map(
      ([parentTypeName, props], index): ElementEditorSection => ({
        name: parentTypeName,
        defaultCollapsed: index > 3,
        fields: props.map((p) => createVirtualPropFE(p)),
      })
    );
    if (sections.length === 0) {
      sections.push({
        name: "Props",
        fields: [createMessageFE("No properties available to edit")],
      });
    }

    return sections;
  }
}
