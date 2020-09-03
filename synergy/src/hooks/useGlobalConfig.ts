import { useMemo } from "react";

import { materialUiComponents } from "../lib/defs/material-ui";

export function useGlobalConfig() {
  const config = useMemo(
    () => ({
      componentConfigs: [materialUiComponents],
    }),
    []
  );
  return { config };
}
