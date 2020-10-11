import React, { FunctionComponent, useEffect, useState } from "react";
import { Backdrop, CircularProgress } from "@material-ui/core";

import { useAuth } from "../hooks/recoil/useAuth";
import { BodyColor } from "./BodyColor";

interface Props {
  loading?: boolean;
  className?: string;
  bodyColor?: string;
}

export const PageFrame: FunctionComponent<Props> = ({
  loading: loadingProp,
  className,
  bodyColor,
  children,
}) => {
  const auth = useAuth();
  const loading = loadingProp || auth.isLoading;

  const [initiallyLoaded, setInitiallyLoaded] = useState(!loading);
  useEffect(() => {
    if (!initiallyLoaded && !loading) setInitiallyLoaded(true);
  }, [initiallyLoaded, loading]);

  return (
    <div className={className || "flex justify-center items-center h-screen"}>
      <Backdrop open={loading || false}>
        <CircularProgress disableShrink />
      </Backdrop>
      {bodyColor && <BodyColor className={bodyColor} />}
      {(initiallyLoaded || !loading) && children}
    </div>
  );
};
