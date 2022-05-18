import { StyleGroup } from "../lib/ast/editors/ASTEditor";
import { RenderEntry } from "../lib/project/RenderEntry";
import { StyleKeys } from "./paint";

export interface SourceMetadata {
  componentName: string;
  directProps: Record<string, unknown>;
  availableImports?: string[]; // files that are imported in the file that this element is defined in
  topLevelVars?: string[]; // variables that are defined at the top level of the file that this element is defined in
}

export enum SelectedElementTargetType {
  RenderEntry = "renderEntry",
  Component = "component",
  VirtualComponent = "virtualComponent",
}

export interface SelectedElementTarget_RenderEntry {
  type: SelectedElementTargetType.RenderEntry;
}
interface SelectedElementTarget_BaseComponent {
  lookupId: string;
  index: number; // index of element within elements/outline
  sourceMetadata: SourceMetadata | undefined;
}
export interface SelectedElementTarget_Component
  extends SelectedElementTarget_BaseComponent {
  type: SelectedElementTargetType.Component;
  element: HTMLElement;
  elements: HTMLElement[];
  styleGroups: StyleGroup[];
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
}
export interface SelectedElementTarget_VirtualComponent
  extends SelectedElementTarget_BaseComponent {
  // component with no direct element
  type: SelectedElementTargetType.VirtualComponent;
}

export type SelectedElementTarget =
  | SelectedElementTarget_RenderEntry
  | SelectedElementTarget_Component
  | SelectedElementTarget_VirtualComponent;

export interface SelectedElement<
  T extends SelectedElementTarget = SelectedElementTarget
> {
  target: T;
  renderEntry: RenderEntry;
  overlayWarnings: string[]; // warnings to show in the overlay view
}

export function isSelectedElementTarget_RenderEntry(
  selectedElement: SelectedElement<SelectedElementTarget> | undefined
): selectedElement is SelectedElement<SelectedElementTarget_RenderEntry> {
  return selectedElement?.target.type === SelectedElementTargetType.RenderEntry;
}
export function isSelectedElementTarget_NotRenderEntry(
  selectedElement: SelectedElement<SelectedElementTarget> | undefined
): selectedElement is SelectedElement<
  Exclude<SelectedElementTarget, SelectedElementTarget_RenderEntry>
> {
  return (
    !!selectedElement &&
    selectedElement.target.type !== SelectedElementTargetType.RenderEntry
  );
}
export function ifSelectedElementTarget_NotRenderEntry(
  selectedElement: SelectedElement<SelectedElementTarget> | undefined
):
  | SelectedElement<
      Exclude<SelectedElementTarget, SelectedElementTarget_RenderEntry>
    >
  | undefined {
  return isSelectedElementTarget_NotRenderEntry(selectedElement)
    ? selectedElement
    : undefined;
}

export function isSelectedElementTarget_Component(
  selectedElement: SelectedElement<SelectedElementTarget> | undefined
): selectedElement is SelectedElement<SelectedElementTarget_Component> {
  return selectedElement?.target.type === SelectedElementTargetType.Component;
}
export function ifSelectedElementTarget_Component(
  selectedElement: SelectedElement<SelectedElementTarget> | undefined
): SelectedElement<SelectedElementTarget_Component> | undefined {
  return isSelectedElementTarget_Component(selectedElement)
    ? selectedElement
    : undefined;
}

export function isSelectedElementTarget_VirtualComponent(
  selectedElement: SelectedElement<SelectedElementTarget> | undefined
): selectedElement is SelectedElement<SelectedElementTarget_VirtualComponent> {
  return (
    selectedElement?.target.type === SelectedElementTargetType.VirtualComponent
  );
}

export function getSelectedElementStyleValue(
  selectedElement: SelectedElement<SelectedElementTarget_Component>,
  styleProp: StyleKeys
): string {
  return (
    selectedElement.target.inlineStyles[styleProp] ||
    selectedElement.target.computedStyles[styleProp] ||
    ""
  );
}
