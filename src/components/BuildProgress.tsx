import React, { FunctionComponent } from "react";
import { CircularProgress } from "@material-ui/core";
import { startCase } from "lodash";

import { useObservable } from "../hooks/useObservable";
import { CompileContext } from "./CompilerComponentView";

interface Props {
  compileContext?: CompileContext;
}
export const BuildProgress: FunctionComponent<Props> = ({ compileContext }) => {
  const buildProgress = useObservable(compileContext?.onProgress);

  return (
    <div className="flex flex-col items-center justify-center absolute inset-0 z-20 dark-glass">
      <CircularProgress
        variant={(buildProgress?.percentage || 0) > 0.1 ? "static" : undefined}
        value={(buildProgress?.percentage || 0) ** 0.5 * 100}
      />
      {startCase(buildProgress?.message || "")}
    </div>
  );
};
