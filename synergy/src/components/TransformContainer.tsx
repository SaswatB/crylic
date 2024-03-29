import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { clamp } from "lodash";

import { ComponentViewZoomAction } from "../types/paint";

const ratio = window.devicePixelRatio; // https://github.com/w3c/uievents/issues/40

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
  const dragState = useRef<undefined | boolean>();

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

  const onPan = (dx: number, dy: number) => {
    const { x, y } = transformRef.current;
    const newX = x + dx;
    const newY = y + dy;
    transformRef.current = { ...transformRef.current, x: newX, y: newY };
    refreshTransform();
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (dragState.current) return;
    if (!transformedElementRef.current) return;
    if (!transformContainerRef.current) return;
    const { scale } = transformRef.current;
    if (e.ctrlKey) {
      const newScale = clamp(
        e.deltaY < 0 ? scale - e.deltaY / 600 : scale / (1 + e.deltaY / 600),
        0.1,
        3
      );
      const { top: containerTop, left: containerLeft } =
        transformContainerRef.current.getBoundingClientRect();

      const ox = e.nativeEvent.pageX - containerLeft;
      const oy = e.nativeEvent.pageY - containerTop;
      changeZoom(newScale, { x: ox, y: oy });
      refreshTransform();
    } else {
      onPan(-e.deltaX / (scale * 2), -e.deltaY / (scale * 2));
    }
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
      onPointerDown={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          e.stopPropagation();
          dragState.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        }
      }}
      onPointerMove={(e) => {
        if (dragState.current) {
          e.preventDefault();
          e.stopPropagation();
          const { scale } = transformRef.current;
          onPan(e.movementX / ratio / scale, e.movementY / ratio / scale);
        }
      }}
      onPointerUp={() => {
        dragState.current = false;
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
