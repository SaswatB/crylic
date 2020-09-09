import React, { FunctionComponent, useRef } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { ComponentViewZoomAction } from "../types/paint";

interface Props {
  zoomAction: ComponentViewZoomAction | undefined;
  onZoomChange: (zoom: number) => void;
}

export const TransformContainer: FunctionComponent<Props> = ({
  zoomAction,
  onZoomChange,
  children,
}) => {
  const scaleRef = useRef(1);
  const changeZoom = (scale: number) => {
    scaleRef.current = scale;
    onZoomChange(scale);
    return scale;
  };
  return (
    <TransformWrapper
      defaultScale={1}
      scale={
        zoomAction === ComponentViewZoomAction.RESET
          ? changeZoom(1)
          : zoomAction === ComponentViewZoomAction.ZOOM_IN
          ? changeZoom(scaleRef.current * 1.5)
          : zoomAction === ComponentViewZoomAction.ZOOM_OUT
          ? changeZoom(scaleRef.current / 1.5)
          : undefined
      }
      defaultPositionX={50}
      defaultPositionY={20}
      positionX={zoomAction === ComponentViewZoomAction.RESET ? 50 : undefined}
      positionY={zoomAction === ComponentViewZoomAction.RESET ? 20 : undefined}
      options={{
        minScale: 0.01,
        maxScale: 3,
        limitToBounds: false,
      }}
      onZoomChange={({ scale }: { scale: number }) => changeZoom(scale)}
    >
      <TransformComponent>{children}</TransformComponent>
    </TransformWrapper>
  );
};
