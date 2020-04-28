import * as it from "io-ts";

export interface CodeEntry {
  id: string;
  filePath: string;
  code: string;
  edit: boolean;
  render: boolean;
}

export type CodeEntryLookupDataMap = Record<string, { ast: any } | undefined>;

export const ProjectConfig = it.type({
  bootstrap: it.string,
});
export type ProjectConfig = it.TypeOf<typeof ProjectConfig>;

export interface Project {
  path: string;
  config?: ProjectConfig;
  codeEntries: CodeEntry[];
}

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
