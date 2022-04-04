import { capitalize } from "lodash";

import {
  ComponentDefinition,
  ComponentDefinitionType,
  CustomComponentConfig,
} from "../../types/paint";

function htmlComponentDef(
  tag: keyof HTMLElementTagNameMap,
  name: string = capitalize(tag),
  defaultAttributes?: Record<string, unknown>
): ComponentDefinition {
  return {
    type: ComponentDefinitionType.HTMLElement,
    display: { name },
    tag,
    defaultAttributes,
  };
}

export const htmlComponents: CustomComponentConfig = {
  name: "Default",
  installed: () => true,
  install: () => undefined,
  components: [
    htmlComponentDef("div", "Row", { style: { display: "flex" } }),
    htmlComponentDef("div", "Column", {
      style: { display: "flex", flexDirection: "column" },
    }),
    htmlComponentDef("h1", "Heading", { textContent: "Heading" }),
    htmlComponentDef("span", "Text", { textContent: "Text" }),
    htmlComponentDef("button"),
    htmlComponentDef("a", "Link"),
    htmlComponentDef("input", "Text Box", { type: "text" }),
    htmlComponentDef("select"),
    htmlComponentDef("input", "Checkbox", { type: "checkbox" }),
    htmlComponentDef("input", "Radio", { type: "radio" }),
  ],
};
