import { StyleGroup } from "../lib/ast/editors/ASTEditor";
import { RenderEntry } from "../lib/project/RenderEntry";
import { StyleKeys } from "./paint";

export interface SourceMetadata {
  componentName: string;
  directProps: Record<string, unknown>;
  availableImports?: string[]; // files that are imported in the file that this element is defined in
}

export interface SelectedElement {
  renderEntry: RenderEntry;
  lookupId: string;
  index: number; // index of element within elements
  // whether the lookup id applies directly to the element (props are passed through to dom)
  // not a 100% guarantee anything else will be passed through though
  // best used to differentiate components from html elements
  hasDomPassthrough: boolean;
  element: HTMLElement;
  elements: HTMLElement[];
  styleGroups: StyleGroup[];
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
  overlayWarnings: string[]; // warnings to show in the overlay view

  sourceMetadata: SourceMetadata | undefined;
}

export function getSelectedElementStyleValue(
  selectedElement: SelectedElement,
  styleProp: StyleKeys
): string {
  return (
    selectedElement.inlineStyles[styleProp] ||
    selectedElement.computedStyles[styleProp] ||
    ""
  );
}
