export const JSX_LOOKUP_DATA_ATTR = "paintlookupid";
export const JSX_LOOKUP_ROOT = "root";

export const JSX_RECENTLY_ADDED_DATA_ATTR = "paintlookupidnew";
export const JSX_RECENTLY_ADDED = "new";

export const STYLED_LOOKUP_CSS_VAR_PREFIX = "--paint-styledlookup-";

export enum SelectModes {
  SelectElement,
  AddDivElement,
}

export const BOILER_PLATE_CODE = `import React from "react";

export function MyComponent() {
  return <div style={{ width: "100%", height: "100%", display: "flex" }} />;
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
