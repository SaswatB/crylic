import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

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
  const transformRef = useRef({ scale: 1, x: 0, y: 0 });
  const transformContainerRef = useRef<HTMLDivElement>(null);
  const transformedElementRef = useRef<HTMLDivElement>(null);

  const refreshTransform = () => {
    if (!transformedElementRef.current) return;
    const { scale, x, y } = transformRef.current;
    transformedElementRef.current.style.transform = `scale(${scale}) translate3d(${x}px, ${y}px, 0)`;
  };
  useLayoutEffect(refreshTransform);

  const changeZoom = useCallback(
    (newScale: number, origin: { x: number; y: number }) => {
      const { scale, x, y } = transformRef.current;
      transformRef.current = {
        ...transformRef.current,
        scale: newScale,
        x: x - origin.x / scale + origin.x / newScale,
        y: y - origin.y / scale + origin.y / newScale,
      };
      onZoomChange(newScale);
    },
    [onZoomChange]
  );

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!transformedElementRef.current) return;
    if (!transformContainerRef.current) return;
    const { scale, x, y } = transformRef.current;
    if (e.ctrlKey) {
      const newScale =
        e.deltaY > 0 ? scale + e.deltaY / 1000 : scale / (1 - e.deltaY / 1000);
      const {
        top: containerTop,
        left: containerLeft,
      } = transformContainerRef.current.getBoundingClientRect();

      const ox = e.nativeEvent.pageX - containerLeft;
      const oy = e.nativeEvent.pageY - containerTop;
      changeZoom(newScale, { x: ox, y: oy });
    } else {
      const newX = x + e.deltaX / (scale * 2);
      const newY = y + e.deltaY / (scale * 2);
      transformRef.current = { ...transformRef.current, x: newX, y: newY };
    }
    refreshTransform();
  };

  useEffect(() => {
    if (zoomAction === ComponentViewZoomAction.RESET) {
      transformRef.current = { scale: 1, x: 0, y: 0 };
    } else if (
      zoomAction === ComponentViewZoomAction.ZOOM_IN ||
      zoomAction === ComponentViewZoomAction.ZOOM_OUT
    ) {
      const { scale } = transformRef.current;
      const { width: containerWidth = 0, height: containerHeight = 0 } =
        transformContainerRef.current?.getBoundingClientRect() || {};

      changeZoom(
        scale * (zoomAction === ComponentViewZoomAction.ZOOM_IN ? 1.2 : 0.8),
        { x: containerWidth / 2, y: containerHeight / 2 }
      );
    }
  }, [changeZoom, zoomAction]);

  return (
    <div
      ref={transformContainerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        userSelect: "none",
        overflow: "hidden",
        margin: 0,
        padding: 0,
      }}
      onWheel={onWheel}
    >
      <div
        ref={transformedElementRef}
        className="flex"
        style={{ transformOrigin: "0 0" }}
      >
        {children}
      </div>
    </div>
  );
};
