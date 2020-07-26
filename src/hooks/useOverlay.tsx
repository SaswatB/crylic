import React, {
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import produce from "immer";

import {
  CompilerComponentViewRef,
  getComponentElementsFromEvent,
} from "../components/CompilerComponentView";
import { Draggable } from "../components/Draggable";
import { Project } from "../lib/project/Project";
import { onMoveResizeCallback, SelectedElement } from "../types/paint";
import { SelectModeType } from "../utils/constants";

let lastDragResizeHandled = 0;
export function useOverlay(
  project: Project | undefined,
  componentView: CompilerComponentViewRef | null | undefined,
  frameSize: { width: number; height: number },
  scaleRef: MutableRefObject<number>,
  selectedElement?: SelectedElement,
  selectModeType?: SelectModeType,
  onSelect?: (componentElement: Element | null | undefined) => void,
  onMoveResizeSelection?: onMoveResizeCallback
) {
  const [highlightBox, setHighlightBox] = useState<DOMRect>();
  const onOverlayMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElements = getComponentElementsFromEvent(
      event,
      componentView,
      scaleRef.current
    );

    // get the first element with a lookup id
    const componentElement = componentElements.find((ce) =>
      project?.primaryElementEditor.getLookupIdFromHTMLElement(ce)
    );

    setHighlightBox(componentElement?.getBoundingClientRect());
  };
  const onOverlayClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    console.log("onOverlayClick", Date.now() - lastDragResizeHandled);
    // todo find a better way to prevent this misfire then this hack
    if (
      selectModeType === undefined &&
      Date.now() - lastDragResizeHandled < 500
    ) {
      return;
    }
    lastDragResizeHandled = 0;
    const componentElements = getComponentElementsFromEvent(
      event,
      componentView,
      scaleRef.current
    );

    // get the first element with a lookup id
    const componentElement = componentElements.find((ce) =>
      project?.primaryElementEditor.getLookupIdFromHTMLElement(ce)
    );

    onSelect?.(componentElement);
  };

  const [tempOffset, setTempOffset] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  useEffect(() => setTempOffset({ x: 0, y: 0, width: 0, height: 0 }), [
    selectedElement,
  ]);
  const {
    selectedElementBoundingBox,
    selectedElementParentBoundingBox,
  } = useMemo(() => {
    if (!selectedElement) return {};

    const componentElements = componentView?.getElementsByLookupId(
      selectedElement?.lookupId
    );
    const pbcr = (selectedElement?.computedStyles.position === "static" &&
      componentElements?.[0].parentElement?.getBoundingClientRect()) || {
      top: 0,
      left: 0,
      ...frameSize,
    };
    const bcr = componentElements?.[0].getBoundingClientRect();
    if (bcr) {
      bcr.x -= pbcr.left;
      bcr.y -= pbcr.top;
    }

    return {
      selectedElementParentBoundingBox: pbcr,
      selectedElementBoundingBox: bcr,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement]);

  const onResizeSelection = (
    finalWidth: string,
    finalHeight: string,
    deltaWidth: number,
    deltaHeight: number,
    preview?: boolean
  ) => {
    onMoveResizeSelection?.(
      undefined,
      undefined,
      undefined,
      undefined,
      deltaWidth ? finalWidth : undefined,
      deltaHeight ? finalHeight : undefined,
      preview
    );
  };

  const selectEnabled = selectModeType !== undefined;
  const previewDraggingHighlight = useRef({ dx: 0, dy: 0 });
  const renderOverlay = () => (
    <div
      className="absolute inset-0"
      style={{
        cursor:
          selectModeType === SelectModeType.AddElement
            ? "copy"
            : selectModeType === SelectModeType.SelectElement
            ? "crosshair"
            : undefined,
      }}
      onMouseMove={selectEnabled ? onOverlayMove : undefined}
      onMouseLeave={() => setHighlightBox(undefined)}
      onClick={onOverlayClick}
    >
      {selectEnabled && highlightBox ? (
        <div
          className="absolute border-blue-300 border-solid pointer-events-none"
          style={{
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height,
            borderWidth: selectEnabled && highlightBox ? "4px" : "2px",
          }}
        />
      ) : (
        selectedElementBoundingBox &&
        selectedElementParentBoundingBox && (
          <Draggable
            className="border-2 border-blue-600 border-solid pulsing-highlight"
            dimensions={{
              top: selectedElementBoundingBox.y + tempOffset.y,
              left: selectedElementBoundingBox.x + tempOffset.x,
              width: selectedElementBoundingBox.width + tempOffset.width,
              height: selectedElementBoundingBox.height + tempOffset.height,
            }}
            bounds={selectedElementParentBoundingBox}
            onDragStart={() => {
              previewDraggingHighlight.current.dx = 0;
              previewDraggingHighlight.current.dy = 0;
            }}
            onDrag={({ deltaX, deltaY }) => {
              onMoveResizeSelection?.(
                deltaX - previewDraggingHighlight.current.dx,
                undefined,
                deltaY - previewDraggingHighlight.current.dy,
                undefined,
                undefined,
                undefined,
                true
              );
              previewDraggingHighlight.current.dx = deltaX;
              previewDraggingHighlight.current.dy = deltaY;
            }}
            onDragStop={() => {
              if (
                previewDraggingHighlight.current.dx ||
                previewDraggingHighlight.current.dy
              ) {
                lastDragResizeHandled = Date.now();
                onMoveResizeSelection?.(
                  0,
                  previewDraggingHighlight.current.dx,
                  0,
                  previewDraggingHighlight.current.dy,
                  undefined,
                  undefined
                );
                setTempOffset(
                  produce((draft) => {
                    draft.x += previewDraggingHighlight.current.dx;
                    draft.y += previewDraggingHighlight.current.dy;
                  })
                );
              }
            }}
            onResize={({ finalWidth, finalHeight, deltaWidth, deltaHeight }) =>
              onResizeSelection(
                finalWidth,
                finalHeight,
                deltaWidth,
                deltaHeight,
                true
              )
            }
            onResizeStop={({
              finalWidth,
              finalHeight,
              deltaWidth,
              deltaHeight,
            }) => {
              if (!deltaWidth && !deltaHeight) return;

              lastDragResizeHandled = Date.now();
              setTempOffset(
                produce((draft) => {
                  draft.width += deltaWidth;
                  draft.height += deltaHeight;
                })
              );
              onResizeSelection(
                finalWidth,
                finalHeight,
                deltaWidth,
                deltaHeight
              );
            }}
          />
        )
      )}
    </div>
  );
  return [renderOverlay] as const;
}
