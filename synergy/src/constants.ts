import { ComponentDefinition } from "./types/paint";

export const CONFIG_FILE_NAME = "crylic.config.js";

// lm_644b8c2629 default frame resolution is iPhone SE
export const DEFAULT_FRAME_WIDTH = 375;
export const DEFAULT_FRAME_HEIGHT = 667;
export const MINIMUM_FRAME_WIDTH = 150;
export const MINIMUM_FRAME_HEIGHT = 150;

export const DEFAULT_FRAME_BACKGROUND_COLOR = "#ffffff";

export const DEFAULT_PROJECT_SOURCE_FOLDER = "src";
export const DEFAULT_PROJECT_HTML_TEMPLATE_PATH = "public/index.html";
export const DEFAULT_HTML_TEMPLATE_SELECTOR = "root";

export enum SelectModeType {
  SelectElement,
  AddElement,
}

export type SelectMode =
  | {
      type: SelectModeType.SelectElement;
    }
  | {
      type: SelectModeType.AddElement;
      component: ComponentDefinition;
    };

export const SelectModeCursor: Record<
  SelectModeType,
  CSSStyleDeclaration["cursor"]
> = {
  [SelectModeType.AddElement]: "copy",
  [SelectModeType.SelectElement]: "crosshair",
};

export interface SelectModeHints {
  beforeChildLookupId?: string; // attempt to perform the action before this child
}

export const CSS_LENGTH_UNITS = [
  { name: "px", value: "px" },
  { name: "%", value: "%" },
  { name: "em", value: "em" },
  { name: "vh", value: "vh" },
  { name: "vw", value: "vw" },
  { name: "ex", value: "ex" },
  { name: "cm", value: "cm" },
  { name: "mm", value: "mm" },
  { name: "in", value: "in" },
  { name: "pt", value: "pt" },
  { name: "pc", value: "pc" },
  { name: "ch", value: "ch" },
  { name: "rem", value: "rem" },
  { name: "vmin", value: "vmin" },
  { name: "vmax", value: "vmax" },
];
