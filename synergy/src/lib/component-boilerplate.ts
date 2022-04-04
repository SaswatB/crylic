import { CSSProperties } from "react";

import { prettyPrintTS } from "./ast/ast-helpers";

export const getBoilerPlateComponent = (
  name: string,
  baseComponent: string,
  styles: CSSProperties,
  includeStyleSheet: boolean,
  styledComponentImport?: string
) =>
  prettyPrintTS(`
  import React from "react";
  ${
    styledComponentImport
      ? `import styled from "${styledComponentImport}";`
      : ""
  }
  ${includeStyleSheet ? `import "./${name}.css";` : ""}
  
  export function ${name}() {
    return (
      <${baseComponent}
        ${includeStyleSheet ? `className="${name}"` : ""}
        ${
          Object.entries(styles).length > 0
            ? `style={${JSON.stringify(styles)}}`
            : ""
        }
      />
    );
  }
  
  ${styledComponentImport ? `const ${baseComponent} = styled.div\`\`;` : ""}
  `);
