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

function htmlComponentDef(
  tag: keyof HTMLElementTagNameMap,
  icon: IconDefinition | (() => ReactNode),
  name: string = capitalize(tag),
  defaultAttributes?: Record<string, unknown>
): ComponentDefinition {
  return {
    type: ComponentDefinitionType.HTMLElement,
    display: {
      id: name,
      name,
      icon:
        typeof icon === "function"
          ? icon
          : () => <FontAwesomeIcon icon={icon} />,
    },
    tag,
    defaultAttributes,
  };
}

export const htmlComponents: CustomComponentConfig = {
  name: "Default",
  installed: () => true,
  install: () => undefined,
  components: [
    htmlComponentDef("div", faBars, "Row", { style: { display: "flex" } }),
    htmlComponentDef(
      "div",
      () => (
        <FontAwesomeIcon
          icon={faBars}
          style={{ transform: "rotate(-90deg)" }}
        />
      ),
      "Column",
      {
        style: { display: "flex", flexDirection: "column" },
      }
    ),
    htmlComponentDef("h1", faHeading, "Heading", { textContent: "Heading" }),
    htmlComponentDef("span", faFont, "Text", { textContent: "Text" }),
    htmlComponentDef("button", faPlusSquare),
    htmlComponentDef("a", faExternalLinkSquareAlt, "Link"),
    htmlComponentDef("input", faHSquare, "Text Box", { type: "text" }),
    htmlComponentDef("select", faCaretSquareDown),
    htmlComponentDef("input", faCheckSquare, "Checkbox", { type: "checkbox" }),
    htmlComponentDef("input", faDotCircle, "Radio", { type: "radio" }),
  ],
  adderLayout: [
    { name: "Containers", components: ["Row", "Column"] },
    { name: "Text", components: ["Heading", "Text"] },
    { name: "Interactive", components: ["Button", "Link"] },
    { name: "Form", components: ["Text Box", "Select", "Checkbox", "Radio"] },
  ],
};
