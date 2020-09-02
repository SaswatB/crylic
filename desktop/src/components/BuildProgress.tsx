import React, { FunctionComponent } from "react";
import { CircularProgress } from "@material-ui/core";
import { startCase } from "lodash";

import { useObservable } from "synergy/src/hooks/useObservable";

import { CompileContext } from "./ComponentView/CompilerComponentView";

interface Props {
  compileContext?: CompileContext;
}
export const BuildProgress: FunctionComponent<Props> = ({ compileContext }) => {
  const buildProgress = useObservable(compileContext?.onProgress);
  const progressVariant =
    (buildProgress?.percentage || 0) > 0.1 ? "static" : undefined;

  return (
    <div className="flex flex-col items-center justify-center absolute inset-0 z-20 dark-glass">
      <CircularProgress
        disableShrink={!progressVariant}
        variant={progressVariant}
        value={(buildProgress?.percentage || 0) ** 0.5 * 100}
      />
      {startCase(buildProgress?.message || "Loading")}
    </div>
  );
};
