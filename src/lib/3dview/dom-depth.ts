import { sortBy } from "lodash";

const NON_RENDERABLE_NODES = [
  "HEAD",
  "TITLE",
  "META",
  "LINK",
  "STYLE",
  "SCRIPT",
  "NOSCRIPT",
  "OPTION",
  "INS",
  "DEL",
];

// https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context
function isStackingContextElement(
  node: Element,
  computedStyle: CSSStyleDeclaration,
  isParentFlex: boolean
) {
  // the root html element
  if (["HTML", "#document-fragment"].includes(node.nodeName)) return true;
  // elements with position fixed or sticky
  if (["fixed", "sticky"].includes(computedStyle.position)) return true;
  // elements with position absolutely or relatively and a z-index value other than "auto"
  if (computedStyle.zIndex !== "auto" && computedStyle.position !== "static")
    return true;
  // elements with an opacity value less than 1.
  if (computedStyle.opacity !== "1") return true;
  // elements with a transform value other than "none"
  if (computedStyle.transform !== "none") return true;
  // elements with a mix-blend-mode value other than "normal"
  if ((computedStyle as any).mixBlendMode !== "normal") return true;
  // elements with a filter value other than "none"
  if (computedStyle.filter !== "none") return true;
  // elements with a perspective value other than "none"
  if (computedStyle.perspective !== "none") return true;
  // elements with isolation set to "isolate"
  if ((computedStyle as any).isolation === "isolate") return true;
  // transform or opacity in will-change even if you don't specify values for these attributes directly
  if (["transform", "opacity"].includes(computedStyle.willChange)) return true;
  // elements with -webkit-overflow-scrolling set to "touch"
  if ((computedStyle as any).webkitOverflowScrolling === "touch") return true;
  // elements with contain set to layout or paint (or a composite that includes those)
  if (
    (computedStyle as any).contain
      .split(" ")
      .find((c: string) => ["layout", "paint", "strict", "content"].includes(c))
  )
    return true;
  // a flex item with a z-index value other than "auto", that is the parent element display: flex|inline-flex,
  if (computedStyle.zIndex !== "auto" && isParentFlex) return true;

  return false;
}

interface PartialDepthNode {
  element: Element;
  styles: CSSStyleDeclaration;
  bounds: DOMRect;

  isStackingContextRoot: boolean;
}

export interface DepthNode extends PartialDepthNode {
  staticChildren: DepthNode[];
  positionedDescendants: DepthNode[];
}

export function buildDepthTree(
  element: Element,
  isParentFlex = false,
  path: PartialDepthNode[] = []
): DepthNode {
  const styles = window.getComputedStyle(element);
  const isStackingContextRoot = isStackingContextElement(
    element,
    styles,
    isParentFlex
  );
  const isFlex = ["flex", "inline-flex"].includes(styles.display);
  const node: PartialDepthNode = {
    element,
    styles,
    bounds: element.getBoundingClientRect(),
    isStackingContextRoot: isStackingContextRoot,
  };

  let children = Array.from(element.children)
    .filter((c) => !NON_RENDERABLE_NODES.includes(c.tagName))
    .map((c) => buildDepthTree(c, isFlex, [...path, node]));
  // handle order for flex items https://developer.mozilla.org/en-US/docs/Web/CSS/order
  // todo look into any special behavior around absolutely position flex children
  if (isFlex) children = sortBy(children, "styles.flexOrder");

  let staticChildren: DepthNode[] = [];
  let positionedDescendants: DepthNode[] = [];

  // process children
  // todo handle float
  children.forEach((child) => {
    // split children based on whether they're positioned
    if (child.styles.position === "static") {
      staticChildren.push(child);
    } else {
      positionedDescendants.push(child);
    }
    // if the child isn't a stacking context, pull its positioned descendants up
    if (!child.isStackingContextRoot) {
      positionedDescendants.push(...child.positionedDescendants);
      child.positionedDescendants = [];
    }
  });

  // if (isStackingContextRoot) {
  //   const zIndicies = sortedUniq(
  //     sortBy(
  //       positionedDescendants.map((child) =>
  //         child.styles.zIndex === "auto" ? "0" : child.styles.zIndex
  //       )
  //     )
  //   );
  // }

  return {
    ...node,
    staticChildren,
    positionedDescendants,
  };
}
