import { ComponentDefinition } from "./types/paint";

// export const CONFIG_FILE_NAME = "crylic.config.js";

export const DEFAULT_FRAME_WIDTH = 350;
export const DEFAULT_FRAME_HEIGHT = 600;

export const DEFAULT_PROJECT_SOURCE_FOLDER = "src";
export const DEFAULT_PROJECT_HTML_TEMPLATE_PATH = "public/index.html";
// export const DEFAULT_HTML_TEMPLATE_SELECTOR = "root";

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

// export const getBoilerPlateComponent = (
//   name: string
// ) => `import React from "react";

// export function ${name}() {
//   return (
//     <div
//       style={{
//         width: "100%",
//         height: "100vh",
//         display: "flex",
//       }}
//     />
//   );
// }
// `;

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
