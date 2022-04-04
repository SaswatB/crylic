import { capitalize } from "lodash";

import {
  ComponentDefinition,
  ComponentDefinitionType,
  CustomComponentConfig,
} from "../../types/paint";

function styledComponentDef(
  tag: keyof HTMLElementTagNameMap,
  name: string = capitalize(tag),
  defaultStyles?: string,
  defaultAttributes?: Record<string, unknown>
): ComponentDefinition {
  return {
    type: ComponentDefinitionType.StyledElement,
    display: { name },
    component: {
      name,
      base: {
        type: ComponentDefinitionType.HTMLElement,
        tag,
      },
    },
    defaultAttributes,
    defaultStyles,
  };
}

export const styledComponents: CustomComponentConfig = {
  name: "Styled Components",
  installed: (project) =>
    project.config.isPackageInstalled(
      project.config.getStyledComponentsImport()
    ),
  install: (project, installPackage) =>
    installPackage(project.config.getStyledComponentsImport()),
  components: [
    styledComponentDef("div", "Row", "\n  display: flex;\n"),
    styledComponentDef(
      "div",
      "Column",
      "\n  display: flex;\n  flex-direction: column;\n"
    ),
    styledComponentDef("h1", "Heading", undefined, { textContent: "Heading" }),
    styledComponentDef("span", "Text", undefined, { textContent: "Text" }),
    styledComponentDef("button"),
    styledComponentDef("a", "Link"),
    styledComponentDef("input", "Text Box", undefined, { type: "text" }),
    styledComponentDef("select"),
    styledComponentDef("input", "Checkbox", undefined, { type: "checkbox" }),
    styledComponentDef("input", "Radio", undefined, { type: "radio" }),
  ],
};
