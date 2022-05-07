import React, { ReactNode } from "react";
import {
  faBars,
  faCaretSquareDown,
  faCheckSquare,
  faDotCircle,
  faExternalLinkSquareAlt,
  faFont,
  faHeading,
  faHSquare,
  faPlusSquare,
  IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { capitalize } from "lodash";

import {
  ComponentDefinition,
  ComponentDefinitionType,
  CustomComponentConfig,
} from "../../types/paint";

function styledComponentDef(
  tag: keyof HTMLElementTagNameMap,
  icon: IconDefinition | (() => ReactNode),
  name: string | { name: string; displayName: string } = capitalize(tag),
  defaultStyles?: string,
  defaultAttributes?: Record<string, unknown>
): ComponentDefinition {
  const displayName = typeof name === "object" ? name.displayName : name;
  const componentName = typeof name === "object" ? name.name : name;
  return {
    type: ComponentDefinitionType.StyledElement,
    display: {
      id: componentName,
      name: displayName,
      icon:
        typeof icon === "function"
          ? icon
          : () => <FontAwesomeIcon icon={icon} />,
    },
    component: {
      name: componentName,
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
    styledComponentDef("div", faBars, "Row", "\n  display: flex;\n"),
    styledComponentDef(
      "div",
      () => (
        <FontAwesomeIcon
          icon={faBars}
          style={{ transform: "rotate(-90deg)" }}
        />
      ),
      "Column",
      "\n  display: flex;\n  flex-direction: column;\n"
    ),
    styledComponentDef("h1", faHeading, "Heading", undefined, {
      textContent: "Heading",
    }),
    styledComponentDef("span", faFont, "Text", undefined, {
      textContent: "Text",
    }),
    styledComponentDef("button", faPlusSquare),
    styledComponentDef("a", faExternalLinkSquareAlt, "Link"),
    styledComponentDef(
      "input",
      faHSquare,
      { name: "TextBox", displayName: "Text Box" },
      undefined,
      {
        type: "text",
      }
    ),
    styledComponentDef("select", faCaretSquareDown),
    styledComponentDef("input", faCheckSquare, "Checkbox", undefined, {
      type: "checkbox",
    }),
    styledComponentDef("input", faDotCircle, "Radio", undefined, {
      type: "radio",
    }),
  ],
  adderLayout: [
    { name: "Containers", components: ["Row", "Column"] },
    { name: "Text", components: ["Heading", "Text"] },
    { name: "Interactive", components: ["Button", "Link"] },
    { name: "Form", components: ["TextBox", "Select", "Checkbox", "Radio"] },
  ],
};
