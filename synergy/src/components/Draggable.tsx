import React, {
  FunctionComponent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DraggableCore } from "react-draggable";
import { clamp, throttle } from "lodash";
import { Resizable } from "re-resizable";
import { Observable } from "rxjs";

import { useDebouncedFunction } from "../hooks/useDebouncedFunction";
import { useInterval } from "../hooks/useInterval";
import { useObservable } from "../hooks/useObservable";
import { useResizeObserver } from "../hooks/useResizeObserver";

const SNAP_GAP = 10;

interface Props {
  className: string;
  element?: HTMLElement;
  calculateBoundingBox: () => {
    dimensions?: { top: number; left: number; width: number; height: number };
    bounds?: { top: number; left: number; width: number; height: number };
    enableResizeBounds?: boolean;
  };
  recalculateBoundsObservable: Observable<number>;
  onDragStart?: () => void;
  onDrag?: (d: { deltaX: number; deltaY: number }) => void;
  onDragStop?: (d: { deltaX: number; deltaY: number }) => void;
  onResizeStart?: () => void;
  onResize?: (r: {
    finalWidth: string;
    finalHeight: string;
    deltaWidth: number;
    deltaHeight: number;
  }) => void;
  onResizeStop?: (r: {
    finalWidth: string;
    finalHeight: string;
    deltaWidth: number;
    deltaHeight: number;
  }) => void;
}
export const Draggable: FunctionComponent<Props> = ({
  className,
  element,
  calculateBoundingBox,
  recalculateBoundsObservable,
  onDragStart,
  onDrag,
  onDragStop,
  onResizeStart,
  onResize,
  onResizeStop,
}) => {
  const divRef = useRef<Resizable>(null);

  // track the mouse position
  const mousePositionRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const callback = (ev: MouseEvent) => {
      mousePositionRef.current.x = ev.pageX;
      mousePositionRef.current.y = ev.pageY;
    };
    document.addEventListener("mousemove", callback, {
      capture: true,
      passive: true,
    });
    return () => document.removeEventListener("mousemove", callback);
  }, []);

  const [localRenderId, setLocalRenderId] = useState(0);
  const rerenderThrottled = useDebouncedFunction(
    () => setLocalRenderId((l) => l + 1),
    10,
    throttle
  );
  useResizeObserver(element, rerenderThrottled);
  // todo don't cheat with useInterval
  useInterval(() => setLocalRenderId((l) => l + 1), 100);

  // get bounds
  const renderId = useObservable(recalculateBoundsObservable);
  const box = useMemo(calculateBoundingBox, [renderId, localRenderId]);
  const skipRender = !box.dimensions || !box.bounds;
  const dimensions = box.dimensions || { top: 0, left: 0, width: 0, height: 0 };
  const bounds = box.bounds || { top: 0, left: 0, width: 0, height: 0 };

  // state that tracks drags
  const dragState = useRef({
    // mouse position when drag started
    startX: 0,
    startY: 0,
    // mouse position at current point in drag
    currentX: 0,
    currentY: 0,
    dimensions,
  });

  // drag snap points
  const dragSnap = useMemo(() => {
    const percents = [0, 0.5, 1];
    const xSnaps = percents.map((percent) =>
      clamp(
        bounds.width * percent - dimensions.width / 2,
        0,
        bounds.width - dimensions.width
      )
    );
    const ySnaps = percents.map((percent) =>
      clamp(
        bounds.height * percent - dimensions.height / 2,
        0,
        bounds.height - dimensions.height
      )
    );

    return { x: xSnaps, y: ySnaps };
  }, [bounds.width, bounds.height, dimensions.width, dimensions.height]);

  // resize snap points
  const resizeSnaps = useMemo(() => {
    const xSnaps = [
      bounds.width - 2 * dimensions.left, // equal space on both side
      bounds.width / 2 - dimensions.left, // half of parent
      bounds.width - dimensions.left, // all of parent
    ];
    const ySnaps = [
      bounds.height - 2 * dimensions.top,
      bounds.height / 2 - dimensions.top,
      bounds.height - dimensions.top,
    ];

    return { x: xSnaps, y: ySnaps };
  }, [bounds.width, bounds.height, dimensions.top, dimensions.left]);

  if (skipRender) return null;
  return (
    <DraggableCore
      onStart={(event) => {
        event.preventDefault();
        event.stopPropagation();

        const { x, y } = mousePositionRef.current;

        dragState.current = {
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
          dimensions,
        };
        onDragStart?.();
      }}
      onDrag={(event, data) => {
        event.preventDefault();
        event.stopPropagation();
        rerenderThrottled();

        const { x, y } = mousePositionRef.current;

        // get the position deltas
        const newDragState = {
          ...dragState.current,
          currentX: x,
          currentY: y,
        };

        // get the new position, handling clamped to bounds
        let elementX = clamp(
          newDragState.dimensions.left +
            newDragState.currentX -
            newDragState.startX,
          0,
          bounds.width - newDragState.dimensions.width
        );
        let elementY = clamp(
          newDragState.dimensions.top +
            newDragState.currentY -
            newDragState.startY,
          0,
          bounds.height - newDragState.dimensions.height
        );

        // handle drag snap (disabled when shift is pressed)
        if (!event.shiftKey) {
          dragSnap.x.forEach((snap) => {
            if (Math.abs(elementX - snap) < SNAP_GAP) {
              elementX = snap;
            }
          });
          dragSnap.y.forEach((snap) => {
            if (Math.abs(elementY - snap) < SNAP_GAP) {
              elementY = snap;
            }
          });
        }

        newDragState.currentX =
          elementX - newDragState.dimensions.left + newDragState.startX;
        newDragState.currentY =
          elementY - newDragState.dimensions.top + newDragState.startY;

        onDrag?.({
          deltaX: newDragState.currentX - newDragState.startX,
          deltaY: newDragState.currentY - newDragState.startY,
        });
        console.log(
          "onDrag",
          newDragState.currentX,
          newDragState.currentY,
          newDragState.startX,
          newDragState.startY,
          newDragState.currentX - newDragState.startX,
          newDragState.currentY - newDragState.startY
        );
        dragState.current = newDragState;
      }}
      onStop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragStop?.({
          deltaX: dragState.current.currentX - dragState.current.startX,
          deltaY: dragState.current.currentY - dragState.current.startY,
        });
      }}
    >
      <Resizable
        ref={divRef}
        className={className}
        style={{
          top: dimensions.top + bounds.top,
          left: dimensions.left + bounds.left,
          zIndex: 10,
          cursor: "move",
        }}
        size={{
          width: dimensions.width,
          height: dimensions.height,
        }}
        snap={resizeSnaps}
        snapGap={SNAP_GAP}
        maxWidth={
          box.enableResizeBounds ? bounds.width - dimensions.left : undefined
        }
        maxHeight={
          box.enableResizeBounds ? bounds.height - dimensions.top : undefined
        }
        enable={{
          // todo handle
          // top: dimensions.height > 0,
          // left: dimensions.width > 0,
          // topLeft: dimensions.height > 0 || dimensions.width > 0,
          // topRight: dimensions.height > 0,
          // bottomLeft: dimensions.width > 0,

          right: true,
          bottom: true,
          bottomRight: true,
        }}
        onResizeStart={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onResizeStart?.();
        }}
        onResize={(event, direction, elementRef, delta) => {
          event.preventDefault();
          event.stopPropagation();
          onResize?.({
            finalWidth: elementRef.style.width,
            finalHeight: elementRef.style.height,
            deltaWidth: delta.width,
            deltaHeight: delta.height,
          });
        }}
        onResizeStop={(event, direction, elementRef, delta) => {
          event.preventDefault();
          event.stopPropagation();
          onResizeStop?.({
            finalWidth: elementRef.style.width,
            finalHeight: elementRef.style.height,
            deltaWidth: delta.width,
            deltaHeight: delta.height,
          });
        }}
      ></Resizable>
    </DraggableCore>
  );
};
