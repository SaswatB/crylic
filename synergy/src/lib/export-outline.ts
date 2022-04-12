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

interface ExportedOutline {
  type: string;
  name: string;
  children: ExportedOutline[];
  textContent?: string; // type: "text"
  styles?: { [key: string]: string | number }; // type: "container"
}

export function exportOutline(
  node: OutlineElement,
  isRoot = true
): ExportedOutline | undefined {
  let type = node.element ? "container" : "group";
  switch (node.element?.tagName.toLowerCase()) {
    case "img":
      type = "image";
      break;
  }

  const children: ExportedOutline[] = [];
  const styles: { [key: string]: string | number } = {};
  if (node.element) {
    // add children based on DOM order, while handling text
    Array.from(node.element.childNodes).forEach((child) => {
      if (
        child.nodeType === Node.TEXT_NODE &&
        child.textContent?.trim().length
      ) {
        children.push({
          type: "text",
          name: "Text",
          children: [],
          textContent: child.textContent,
        });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const childOutlineElement = node.children.find(
          (c) =>
            c.element === child ||
            c.closestElements.includes(child as HTMLElement)
        );
        if (childOutlineElement) {
          const exportedChild = exportOutline(childOutlineElement, false);
          if (exportedChild) children.push(exportedChild);
        }
      }
    });

    // add attributes
    const elementStyles = window.getComputedStyle(node.element);
    if (elementStyles.display === "none") {
      return undefined;
    }
    if (!isRoot) {
      styles.offsetTop = node.element.offsetTop;
      styles.offsetLeft = node.element.offsetLeft;
    }

    ([
      "color",
      "fontFamily",
      "fontSize",
      "fontStyle",
      "fontWeight",
      // "textDecoration", // todo add this
      "lineHeight",
      "backgroundColor",
      "opacity",
      "width",
      "height",
      "transform",
      ...expandDirections("padding"),
      ...expandDirections("margin"),
      ...expandDirectionsSuffixed("border", "Width"),
      ...expandDirectionsSuffixed("border", "Color"),
      ...expandDirectionsSuffixed("border", "Style"),
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
    ] as const).forEach((style) => {
      if (!elementStyles[style]) return;
      if (["rgb(0, 0, 0)", "0px", "none"].includes(elementStyles[style]))
        return;
      if (style === "opacity" && elementStyles[style] === "1") return;
      if (style === "fontStyle" && elementStyles[style] === "normal") return;
      if (style === "fontWeight" && elementStyles[style] === "400") return;

      styles[style] = elementStyles[style];
    });
  } else {
    children.push(
      ...node.children.map((c) => exportOutline(c, false)).filter(isDefined)
    );
  }

  return {
    type,
    name: node.tag,
    children,
    styles,
  };
}
