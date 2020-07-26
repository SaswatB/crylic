import { ComponentDefinition } from "../types/paint";

export const CONFIG_FILE_NAME = "crylic.config.js";

export const DEFAULT_FRAME_WIDTH = 350;
export const DEFAULT_FRAME_HEIGHT = 600;

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
  | ({
      type: SelectModeType.AddElement;
    } & ComponentDefinition);

export enum CODE_ENTRY_TYPE {
  StyleSheet,
  Component,
}

export enum CODE_ENTRY_BACKING {
  Virtual,
  Physical,
}

export const getBoilerPlateComponent = (
  name: string
) => `import React from "react";

export function ${name}() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
      }}
    />
  );
}
`;

export const CSS_POSITION_OPTIONS = [
  { name: "Static", value: "static" },
  { name: "Relative", value: "relative" },
  { name: "Fixed", value: "fixed" },
  { name: "Absolute", value: "absolute" },
  { name: "Sticky", value: "sticky" },
];

export const CSS_DISPLAY_OPTIONS = [
  { name: "Inline", value: "inline" },
  { name: "Block", value: "block" },
  { name: "Flex", value: "flex" },
  { name: "None", value: "none" },
  { name: "Contents", value: "contents" },
  { name: "Grid", value: "grid" },
  { name: "Inline Block", value: "inline-block" },
  { name: "Inline Flex", value: "inline-flex" },
  { name: "Inline Grid", value: "inline-grid" },
  { name: "Inline Table", value: "inline-table" },
  { name: "List Item", value: "list-item" },
  { name: "Run In", value: "run-in" },
  { name: "Table", value: "table" },
  { name: "Table Caption", value: "table-caption" },
  { name: "Table Column Group", value: "table-column-group" },
  { name: "Table Header Group", value: "table-header-group" },
  { name: "Table Footer Group", value: "table-footer-group" },
  { name: "Table Row Group", value: "table-row-group" },
  { name: "Table Cell", value: "table-cell" },
  { name: "Table Column", value: "table-column" },
  { name: "Table Row", value: "table-row" },
];

export const CSS_BOX_SIZING_OPTIONS = [
  { name: "Content Box", value: "content-box" },
  { name: "Border Box", value: "border-box" },
];

export const CSS_FLEX_DIRECTION_OPTIONS = [
  { name: "Row", value: "row" },
  { name: "Column", value: "column" },
  { name: "Row Reverse", value: "row-reverse" },
  { name: "Column Reverse", value: "column-reverse" },
];

export const CSS_FLEX_WRAP_OPTIONS = [
  { name: "No", value: "No Wrap" },
  { name: "Yes", value: "wrap" },
  { name: "Reverse", value: "wrap-reverse" },
];

export const CSS_ALIGN_ITEMS_OPTIONS = [
  { name: "Normal", value: "normal" },
  { name: "Stretch", value: "stretch" },
  { name: "Center", value: "center" },
  { name: "Start", value: "start" },
  { name: "End", value: "end" },
  { name: "Flex Start", value: "flex-start" },
  { name: "Flex End", value: "flex-end" },
  { name: "Baseline", value: "baseline" },
  { name: "First Baseline", value: "first baseline" },
  { name: "Last Baseline", value: "last baseline" },
  { name: "Safe Center", value: "safe center" },
  { name: "Unsafe Center", value: "unsafe center" },
];

export const CSS_JUSTIFY_CONTENT_OPTIONS = [
  { name: "Normal", value: "normal" },
  { name: "Center", value: "center" },
  { name: "Start", value: "start" },
  { name: "End", value: "end" },
  { name: "Left", value: "left" },
  { name: "Right", value: "right" },
  { name: "Flex Start", value: "flex-start" },
  { name: "Flex End", value: "flex-end" },
  { name: "Space Between", value: "space-between" },
  { name: "Space Around", value: "space-around" },
  { name: "Space Evenly", value: "space-evenly" },
  { name: "Stretch", value: "stretch" },
  { name: "Safe Center", value: "safe center" },
  { name: "Unsafe Center", value: "unsafe center" },
];

export const CSS_TEXT_ALIGN_OPTIONS = [
  { name: "Left", value: "left" },
  { name: "Right", value: "right" },
  { name: "Center", value: "center" },
  { name: "Justify", value: "justify" },
];

export const CSS_TEXT_DECORATION_LINE_OPTIONS = [
  { name: "None", value: "none" },
  { name: "Underline", value: "underline" },
  { name: "Overline", value: "overline" },
  { name: "Strike Through", value: "line-through" },
];

export const CSS_FONT_WEIGHT_OPTIONS = [
  { name: "Normal", value: "normal" },
  { name: "Bold", value: "bold" },
  { name: "Bolder", value: "bolder" },
  { name: "Lighter", value: "lighter" },
  { name: "100", value: "100" },
  { name: "200", value: "200" },
  { name: "300", value: "300" },
  { name: "400", value: "400" },
  { name: "500", value: "500" },
  { name: "600", value: "600" },
  { name: "700", value: "700" },
  { name: "800", value: "800" },
  { name: "900", value: "900" },
];

export const CSS_FONT_FAMILY_OPTIONS = [
  { name: "Sans-Serif", value: "sans-serif", category: "Sans-Serif" },
  { name: "Arial", value: '"Arial"', category: "Sans-Serif" },
  { name: "Arial Black", value: '"Arial Black"', category: "Sans-Serif" },
  { name: "Arial Narrow", value: '"Arial Narrow"', category: "Sans-Serif" },
  {
    name: "Arial Rounded MT Bold",
    value: '"Arial Rounded MT Bold"',
    category: "Sans-Serif",
  },
  { name: "Century Gothic", value: '"Century Gothic"', category: "Sans-Serif" },
  { name: "Tahoma", value: '"Tahoma"', category: "Sans-Serif" },
  { name: "Trebuchet MS", value: '"Trebuchet MS"', category: "Sans-Serif" },
  { name: "Verdana", value: '"Verdana"', category: "Sans-Serif" },
  { name: "Serif", value: "serif", category: "Serif" },
  { name: "Georgia", value: '"Georgia"', category: "Serif" },
  { name: "Lucida Bright", value: '"Lucida Bright"', category: "Serif" },
  { name: "Palatino", value: '"Palatino"', category: "Serif" },
  { name: "Baskerville", value: '"Baskerville"', category: "Serif" },
  { name: "Times New Roman", value: '"Times New Roman"', category: "Serif" },
  { name: "Monospaced", value: "monospaced", category: "Monospaced" },
  { name: "Courier New", value: '"Courier New"', category: "Monospaced" },
  {
    name: "Lucida Sans Typewriter",
    value: '"Lucida Sans Typewriter"',
    category: "Monospaced",
  },
  { name: "Fantasy", value: "fantasy", category: "Fantasy" },
  { name: "Copperplate", value: '"Copperplate"', category: "Fantasy" },
  { name: "Papyrus", value: '"Papyrus"', category: "Fantasy" },
  { name: "Script", value: "script", category: "Script" },
  { name: "Brush Script MT", value: '"Brush Script MT"', category: "Script" },
];

export const CSS_CURSOR_OPTIONS = [
  { name: "Auto", value: "auto" },
  { name: "Default", value: "default" },
  { name: "None", value: "none" },
  { name: "Context Menu", value: "context-menu" },
  { name: "Help", value: "help" },
  { name: "Pointer", value: "pointer" },
  { name: "Progress", value: "progress" },
  { name: "Wait", value: "wait" },
  { name: "Cell", value: "cell" },
  { name: "Crosshair", value: "crosshair" },
  { name: "Text", value: "text" },
  { name: "Vertical Text", value: "vertical-text" },
  { name: "Alias", value: "alias" },
  { name: "Copy", value: "copy" },
  { name: "Move", value: "move" },
  { name: "No Drop", value: "no-drop" },
  { name: "Not Allowed", value: "not-allowed" },
  { name: "E Resize", value: "e-resize" },
  { name: "N Resize", value: "n-resize" },
  { name: "NE Resize", value: "ne-resize" },
  { name: "NW Resize", value: "nw-resize" },
  { name: "S Resize", value: "s-resize" },
  { name: "SE Resize", value: "se-resize" },
  { name: "SW Resize", value: "sw-resize" },
  { name: "W Resize", value: "w-resize" },
  { name: "EW Resize", value: "ew-resize" },
  { name: "NS Resize", value: "ns-resize" },
  { name: "NESW Resize", value: "nesw-resize" },
  { name: "NWSE Resize", value: "nwse-resize" },
  { name: "Col Resize", value: "col-resize" },
  { name: "Row Resize", value: "row-resize" },
  { name: "All Scroll", value: "all-scroll" },
  { name: "Zoom In", value: "zoom-in" },
  { name: "Zoom Out", value: "zoom-out" },
  { name: "Grab", value: "grab" },
  { name: "Grabbing", value: "grabbing" },
];

export const CSS_BACKGROUND_SIZE_OPTIONS = [
  { name: "Contain", value: "contain" },
  { name: "Cover", value: "cover" },
  { name: "Auto", value: "auto" },
];

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
