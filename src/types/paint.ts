import { namedTypes as t } from "ast-types";

export interface CodeEntry {
  id: string;
  filePath: string;
  code: string;
}

export type CodeEntryLookupDataMap = Record<
  string,
  { ast: t.File } | undefined
>;

export interface SelectedElement {
  lookupId: string;
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
}

export interface OutlineElement {
  tag: string;
  lookupId: string;
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
