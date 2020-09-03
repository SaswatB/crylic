export const CONFIG_FILE_NAME = "crylic.config.js";

export const DEFAULT_HTML_TEMPLATE_SELECTOR = "root";

export const getBoilerPlateComponent = (
  name: string
) => `import React from "react";

export function ${name}() {
  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
      }}
    />
  );
}
`;
