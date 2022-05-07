import { useMemo } from "react";

import { materialUiComponents } from "../lib/defs/material-ui";
import { htmlComponents } from "../lib/defs/native-html";
import { styledComponents } from "../lib/defs/styled-components";

export function useGlobalConfig() {
  const config = useMemo(
    () => ({
      componentConfigs: [
        htmlComponents,
        styledComponents,
        materialUiComponents,
      ],
    }),
    []
  );
  return { config };
}
