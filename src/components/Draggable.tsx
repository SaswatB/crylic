import React, {
  FunctionComponent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DraggableCore } from "react-draggable";
import { clamp } from "lodash";
import { Resizable } from "re-resizable";

const SNAP_GAP = 10;

interface Props {
  className: string;
  dimensions: { top: number; left: number; width: number; height: number };
  bounds: { top: number; left: number; width: number; height: number };
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
  dimensions,
  bounds,
  onDragStart,
  onDrag,
  onDragStop,
  onResizeStart,
  onResize,
  onResizeStop,
}) => {
  const divRef = useRef<Resizable>(null);

  // state that tracks drags
  const [dragState, setDragState] = useState({
    // mouse position when drag started
    startX: 0,
    startY: 0,
    // mouse position at current point in drag
    currentX: 0,
    currentY: 0,
  });
  // clear drag state when element location/size gets updated
  useEffect(() => {
    setDragState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  }, [dimensions]);
  // drag derivatives
  const dragTop = dimensions.top + dragState.currentY - dragState.startY;
  const dragLeft = dimensions.left + dragState.currentX - dragState.startX;
  const widthOffset = bounds.width - dragLeft;
  const heightOffset = bounds.height - dragTop;

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

  return (
    <DraggableCore
      onStart={(event, data) => {
        event.preventDefault();
        event.stopPropagation();

        setDragState({
          startX: data.x,
          startY: data.y,
          currentX: data.x,
          currentY: data.y,
        });
        onDragStart?.();
      }}
      onDrag={(event, data) => {
        event.preventDefault();
        event.stopPropagation();

        setDragState((currentDragState) => {
          // get the new position, handling clamped to bounds
          let elementX = clamp(
            dimensions.left + data.x - currentDragState.startX,
            0,
            bounds.width - dimensions.width
          );
          let elementY = clamp(
            dimensions.top + data.y - currentDragState.startY,
            0,
            bounds.height - dimensions.height
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

          // get the position deltas
          const newDragState = {
            ...currentDragState,
            currentX: elementX - dimensions.left + currentDragState.startX,
            currentY: elementY - dimensions.top + currentDragState.startY,
          };

          onDrag?.({
            deltaX: newDragState.currentX - newDragState.startX,
            deltaY: newDragState.currentY - newDragState.startY,
          });
          return newDragState;
        });
      }}
      onStop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDragStop?.({
          deltaX: dragState.currentX - dragState.startX,
          deltaY: dragState.currentY - dragState.startY,
        });
      }}
    >
      <Resizable
        ref={divRef}
        className={className}
        style={{
          top: dragTop,
          left: dragLeft,
          zIndex: 10,
          cursor: "move",
        }}
        size={{
          width: dimensions.width,
          height: dimensions.height,
        }}
        snap={resizeSnaps}
        snapGap={SNAP_GAP}
        maxWidth={widthOffset}
        maxHeight={heightOffset}
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
