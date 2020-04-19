export const JSX_LOOKUP_DATA_ATTR = "paintlookupid";
export const JSX_LOOKUP_ROOT = "root";

export const JSX_RECENTLY_ADDED_DATA_ATTR = "paintlookupidnew";
export const JSX_RECENTLY_ADDED = "new";

export const STYLED_LOOKUP_CSS_VAR_PREFIX = "--paint-styledlookup-";

export enum SelectModes {
  SelectElement,
  AddElement,
}

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
