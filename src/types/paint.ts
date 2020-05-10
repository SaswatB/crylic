import * as it from "io-ts";

import { StyleGroup } from "../utils/ast/editors/ASTEditor";

export interface CodeEntry {
  id: string;
  filePath: string;
  code: string;
  edit: boolean;
  render: boolean;

  // metadata generated from code
  ast?: any;
  codeWithLookupData?: string;
}

export const ProjectConfig = it.type({
  bootstrap: it.string,
});
export type ProjectConfig = it.TypeOf<typeof ProjectConfig>;

export interface SelectedElement {
  lookupId: string;
  element: HTMLElement;
  styleGroups: StyleGroup[];
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
}

export interface OutlineElement {
  tag: string;
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
