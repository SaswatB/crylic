export const JSX_LOOKUP_DATA_ATTR = 'paintlookupid';
export const JSX_LOOKUP_ROOT = 'root';

export const JSX_RECENTLY_ADDED_DATA_ATTR = 'paintlookupidnew';
export const JSX_RECENTLY_ADDED = 'new';

export const STYLED_LOOKUP_CSS_VAR_PREFIX = '--paint-styledlookup-';

export enum SelectModes {
  SelectElement,
  AddDivElement,
}

export const BOILER_PLATE_CODE = `import React from "react";

export function MyComponent() {
  return <div style={{ width: "100%", height: "100%", display: "flex" }} />;
}
`