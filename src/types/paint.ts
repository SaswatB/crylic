import * as it from "io-ts";

import { ViewContext } from "../components/CompilerComponentView";
import { StyleGroup } from "../utils/ast/editors/ASTEditor";

export interface CodeEntry {
  id: string;
  filePath: string;
  code: string | undefined;
  edit: boolean;

  // metadata generated from code
  ast?: any;
  codeWithLookupData?: string;
  isRenderable?: boolean;
  isEditable?: boolean;
  exportName?: string;
  exportIsDefault?: boolean;
}

export interface RenderEntry {
  id: string;
  name: string;
  codeId: string;
  route?: string;
}

export const ProjectConfig = it.type({
  bootstrap: it.union([it.string, it.undefined]),
  sourceFolder: it.union([it.string, it.undefined]),
});
export type ProjectConfig = it.TypeOf<typeof ProjectConfig>;

export interface SourceMetadata {
  componentName: string;
  directProps: Record<string, unknown>;
}

export interface SelectedElement {
  renderId: string;
  lookupId: string;
  element: HTMLElement;
  styleGroups: StyleGroup[];
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;

  sourceMetadata: SourceMetadata | undefined;
  viewContext: ViewContext | undefined;
}

export interface OutlineElement {
  tag: string;
  renderId: string;
  lookupId: string;
  element: HTMLElement | undefined;
  children: OutlineElement[];
}

export type onMoveResizeCallback = (
  deltaX: number | undefined,
  totalDeltaX: number | undefined,
  deltaY: number | undefined,
  totalDeltaY: number | undefined,
  width: string | undefined,
  height: string | undefined,
  preview?: boolean
) => void;

export type Styles = {
  styleName: keyof CSSStyleDeclaration;
  styleValue: string;
}[];
