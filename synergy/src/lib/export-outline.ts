import { OutlineElement } from "../types/paint";
import { isDefined } from "./utils";

function expandDirections<T extends string, U extends string>(prop: T) {
  return [
    `${prop}Top`,
    `${prop}Left`,
    `${prop}Bottom`,
    `${prop}Right`,
  ] as const;
}

function expandDirectionsSuffixed<T extends string, U extends string>(
  prop: T,
  suffix: U
) {
  return [
    `${prop}Top${suffix}`,
    `${prop}Left${suffix}`,
    `${prop}Bottom${suffix}`,
    `${prop}Right${suffix}`,
  ] as const;
}

function getTextOffsetRelativeToElement(
  element: HTMLElement,
  textNode: ChildNode
) {
  const elementRect = element.getBoundingClientRect();
  const range = document.createRange();
  range.selectNode(textNode);
  const textRect = range.getBoundingClientRect();
  return {
    top: textRect.top - elementRect.top,
    left: textRect.left - elementRect.left,
  };
}

// lm_e5c40550c3 copied interface
interface ExportedOutline {
  type: string;
  name: string;
  children: ExportedOutline[];
  textContent?: string; // type: "text"
  styles?: { [key: string]: string }; // type: "container"
}

export function exportOutline(
  node: OutlineElement,
  parentElement?: HTMLElement
): ExportedOutline | undefined {
  let type = node.element ? "container" : "group";
  switch (node.element?.tagName.toLowerCase()) {
    case "img":
      type = "image";
      break;
  }

  const children: ExportedOutline[] = [];
  const styles: { [key: string]: string } = {};
  if (node.element) {
    const elementStyles = window.getComputedStyle(node.element);

    // add children based on DOM order, while handling text
    Array.from(node.element.childNodes).forEach((child) => {
      if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent?.trim().length
      ) {
        // extract text specific styles
        const textStyles: { [key: string]: string } = {};
        (
          [
            "color",
            "fontFamily",
            "fontSize",
            "fontStyle",
            "fontWeight",
            // "textDecoration", // todo add this
            "lineHeight",
          ] as const
        ).forEach((style) => {
          if (!elementStyles[style]) return;
          if (style === "fontStyle" && elementStyles[style] === "normal")
            return;
          if (style === "fontWeight" && elementStyles[style] === "400") return;
          if (style === "fontFamily") {
            textStyles[style] = elementStyles[style].replaceAll('"', "");
            return;
          }

          textStyles[style] = elementStyles[style];
        });

        // get text location
        const textOffset = getTextOffsetRelativeToElement(node.element!, child);
        textStyles.top = `${textOffset.top}px`;
        textStyles.left = `${textOffset.left}px`;

        children.push({
          type: "text",
          name: "Text",
          children: [],
          textContent: child.textContent,
          styles: textStyles,
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childOutlineElement = node.children.find(
          (c) =>
            c.element === child ||
            c.closestElements.includes(child as HTMLElement)
        );
        if (childOutlineElement) {
          const exportedChild = exportOutline(
            childOutlineElement,
            node.element
          );
          if (exportedChild) children.push(exportedChild);
        }
      }
    });

    // add attributes
    if (elementStyles.display === "none") {
      return undefined;
    }
    if (parentElement) {
      const pbox = parentElement.getBoundingClientRect();
      const ebox = node.element.getBoundingClientRect();
      styles.top = `${ebox.top - pbox.top}px`;
      styles.left = `${ebox.left - pbox.left}px`;
    }
    styles.width = `${node.element.offsetWidth}px`;
    styles.height = `${node.element.offsetHeight}px`;

    (
      [
        "backgroundColor",
        "opacity",
        "transform",
        ...expandDirectionsSuffixed("border", "Width"),
        ...expandDirectionsSuffixed("border", "Color"),
        ...expandDirectionsSuffixed("border", "Style"),
        "borderTopLeftRadius",
        "borderTopRightRadius",
        "borderBottomLeftRadius",
        "borderBottomRightRadius",
      ] as const
    ).forEach((style) => {
      if (!elementStyles[style]) return;
      if (["rgb(0, 0, 0)", "0px", "none"].includes(elementStyles[style]))
        return;
      if (style === "opacity" && elementStyles[style] === "1") return;

      styles[style] = elementStyles[style];
    });
    if (elementStyles.overflow === "hidden") styles.clip = "true";
  }
  // if there's a dom disconnect, like a portal, the dom children might not match the outline children
  // so this handles both virtual nodes (which have no html element) and portals
  if (children.length === 0) {
    children.push(
      ...node.children
        .map((c) => exportOutline(c, parentElement))
        .filter(isDefined)
    );
  }

  return {
    type,
    name: node.tag,
    children,
    styles,
  };
}
