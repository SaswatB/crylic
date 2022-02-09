import { StyleGroup } from "../lib/ast/editors/ASTEditor";
import { RenderEntry } from "../lib/project/RenderEntry";

export interface SourceMetadata {
  componentName: string;
  directProps: Record<string, unknown>;
}

export interface SelectedElement {
  renderEntry: RenderEntry;
  lookupId: string;
  index: number; // index of element within elements
  element: HTMLElement;
  elements: HTMLElement[];
  styleGroups: StyleGroup[];
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;

  sourceMetadata: SourceMetadata | undefined;
}
