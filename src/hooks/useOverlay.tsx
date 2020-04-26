import React, { useEffect, useMemo, useRef, useState } from "react";
import { DraggableData, ResizableDelta, Rnd } from "react-rnd";
import produce from "immer";
import { cloneDeep } from "lodash";

import {
  CompilerComponentViewRef,
  getComponentElementFromEvent,
} from "../components/CompilerComponentView";
import { onMoveResizeCallback, SelectedElement } from "../types/paint";
import { JSXASTEditor } from "../utils/ast/editors/JSXASTEditor";
import { SelectModeType } from "../utils/constants";

let lastDragResizeHandled = 0;
export function useOverlay(
  componentView: CompilerComponentViewRef | null | undefined,
  selectedElement?: SelectedElement,
  selectModeType?: SelectModeType,
  onSelect?: (componentElement: Element | null | undefined) => void,
  onMoveResizeSelection?: onMoveResizeCallback
) {
  const [highlightBox, setHighlightBox] = useState<DOMRect>();
  const onOverlayMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElement = getComponentElementFromEvent(event, componentView);

    const lookupId =
      componentElement &&
      new JSXASTEditor().getLookupIdsFromHTMLElement(componentElement)[0];
    if (lookupId) {
      setHighlightBox(componentElement?.getBoundingClientRect());
    } else {
      setHighlightBox(undefined);
    }
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
    const componentElement = getComponentElementFromEvent(event, componentView);
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

    const componentElement = componentView?.getElementByLookupId(
      selectedElement?.lookupId
    );
    const pbcr =
      selectedElement?.computedStyles.position === "static"
        ? componentElement?.parentElement?.getBoundingClientRect()
        : undefined;
    const bcr = componentElement?.getBoundingClientRect();
    if (pbcr && bcr) {
      bcr.x -= pbcr.x;
      bcr.y -= pbcr.y;
    }

    return {
      selectedElementParentBoundingBox: pbcr,
      selectedElementBoundingBox: bcr,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement]);

  const onResizeSelection = (
    ref: HTMLDivElement,
    delta: ResizableDelta,
    preview?: boolean
  ) => {
    if (delta.height) {
      if (delta.width) {
        onMoveResizeSelection?.(
          undefined,
          undefined,
          undefined,
          undefined,
          ref.style.width,
          ref.style.height,
          preview
        );
      } else {
        onMoveResizeSelection?.(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          ref.style.height,
          preview
        );
      }
    } else {
      onMoveResizeSelection?.(
        undefined,
        undefined,
        undefined,
        undefined,
        ref.style.width,
        undefined,
        preview
      );
    }
  };

  const selectEnabled = selectModeType !== undefined;
  const [draggingHighlight, setDraggingHighlight] = useState<DraggableData>();
  const previewDraggingHighlight = useRef({ dx: 0, dy: 0 });
  const renderOverlay = () => (
    <div
      className="absolute inset-0"
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
        selectedElementBoundingBox && (
          <div
            className="absolute"
            style={
              selectedElementParentBoundingBox
                ? {
                    top: selectedElementParentBoundingBox.top,
                    left: selectedElementParentBoundingBox.left,
                    width: selectedElementParentBoundingBox.width,
                    height: selectedElementParentBoundingBox.height,
                  }
                : {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                  }
            }
          >
            <Rnd
              className="border-2 border-blue-300 border-solid"
              size={{
                width: selectedElementBoundingBox.width + tempOffset.width,
                height: selectedElementBoundingBox.height + tempOffset.height,
              }}
              position={{
                x: selectedElementBoundingBox.x + tempOffset.x,
                y: selectedElementBoundingBox.y + tempOffset.y,
              }}
              enableResizing={{
                bottom: true,
                right: true,
                bottomRight: true,

                top: false,
                left: false,
                topLeft: false,
                topRight: false,
                bottomLeft: false,
              }}
              bounds="parent"
              onDragStart={(e, d) => {
                setDraggingHighlight(cloneDeep(d));
                previewDraggingHighlight.current.dx = 0;
                previewDraggingHighlight.current.dy = 0;
              }}
              onDrag={(e, d) => {
                e.preventDefault();
                e.stopPropagation();
                const deltaX =
                  d.x -
                  (draggingHighlight?.x || 0) -
                  previewDraggingHighlight.current.dx;
                const deltaY =
                  d.y -
                  (draggingHighlight?.y || 0) -
                  previewDraggingHighlight.current.dy;
                onMoveResizeSelection?.(
                  deltaX,
                  undefined,
                  deltaY,
                  undefined,
                  undefined,
                  undefined,
                  true
                );
                previewDraggingHighlight.current.dx += deltaX;
                previewDraggingHighlight.current.dy += deltaY;
              }}
              onDragStop={(e, d) => {
                console.log("onDragStop", draggingHighlight, d);
                setDraggingHighlight(undefined);
                const deltaX = d.x - (draggingHighlight?.x || 0);
                const deltaY = d.y - (draggingHighlight?.y || 0);
                if (deltaX || deltaY) {
                  lastDragResizeHandled = Date.now();
                  const offsetDeltaX =
                    deltaX - previewDraggingHighlight.current.dx;
                  const offsetDeltaY =
                    deltaY - previewDraggingHighlight.current.dy;
                  onMoveResizeSelection?.(
                    offsetDeltaX,
                    deltaX,
                    offsetDeltaY,
                    deltaY,
                    undefined,
                    undefined
                  );
                  setTempOffset(
                    produce((draft) => {
                      draft.x += deltaX;
                      draft.y += deltaY;
                    })
                  );
                }
              }}
              onResize={(e, direction, ref, delta, position) =>
                onResizeSelection(ref, delta, true)
              }
              onResizeStop={(e, direction, ref, delta, position) => {
                if (!delta.width && !delta.height) return;
                console.log("onResizeStop");

                lastDragResizeHandled = Date.now();
                setTempOffset(
                  produce((draft) => {
                    draft.width += delta.width;
                    draft.height += delta.height;
                  })
                );
                onResizeSelection(ref, delta);
              }}
            />
          </div>
        )
      )}
    </div>
  );
  return [renderOverlay] as const;
}
