import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSnackbar } from "notistack";
import { Observable, Subject } from "rxjs";

import { SelectModeType } from "../../constants";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { Project } from "../../lib/project/Project";
import {
  FrameSettings,
  onMoveResizeCallback,
  ViewContext,
} from "../../types/paint";
import { SelectedElement } from "../../types/selected-element";
import { Draggable } from "../Draggable";

const getComponentElementsFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  viewContext: ViewContext | undefined,
  scale: number
) => {
  const boundingBox = viewContext?.iframe.getBoundingClientRect();
  if (!boundingBox) return [];

  const x = (event.clientX - boundingBox.x) / scale;
  const y = (event.clientY - boundingBox.y) / scale;
  return viewContext?.getElementsAtPoint(x, y) || [];
};

const getBestElementFromEvent = (
  project: Project | undefined,
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  viewContext: ViewContext | undefined,
  scale: number
) => {
  const componentElements = getComponentElementsFromEvent(
    event,
    viewContext,
    scale
  );

  function getLookupId(element: HTMLElement) {
    return project?.primaryElementEditor.getLookupIdFromHTMLElement(element);
  }

  // get the first element with a lookup id
  let componentElement = componentElements.find(getLookupId);

  // if no element with a lookup id wa found, try to find any child of the found nodes that has a lookup id
  if (!componentElement && componentElements.length > 0) {
    componentElements.forEach((ce) => {
      if (componentElement) return;

      // breath first search
      let children = Array.from(ce.children);
      let nextLevel: Element[] = [];
      let depth = 0;
      while (children.length > 0 && depth++ < 5) {
        for (let child of children) {
          if (getLookupId(child as HTMLElement)) {
            componentElement = child as HTMLElement;
            break;
          }
          nextLevel.push(...Array.from(child.children));
        }

        children = nextLevel;
        nextLevel = [];
      }
    });
  }

  return componentElement;
};

let lastDragResizeHandled = 0;
export function useOverlay(
  project: Project | undefined,
  viewContext: ViewContext | undefined,
  frameSettings: FrameSettings,
  addTempStylesObservable: Observable<unknown>,
  scaleRef: MutableRefObject<number>,
  selectedElement?: SelectedElement,
  selectModeType?: SelectModeType,
  onSelect?: (componentElement: Element | null | undefined) => void,
  onMoveResizeSelection?: onMoveResizeCallback
) {
  const { enqueueSnackbar } = useSnackbar();
  const [highlightBox, setHighlightBox] = useState<DOMRect>();
  const onOverlayMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElement = getBestElementFromEvent(
      project,
      event,
      viewContext,
      scaleRef.current
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
    const componentElement = getBestElementFromEvent(
      project,
      event,
      viewContext,
      scaleRef.current
    );

    onSelect?.(componentElement);
  };

  const calculateBoundingBox = () => {
    if (!selectedElement?.element) return {};

    const pbcr = (selectedElement?.computedStyles.position === "static" &&
      selectedElement.element.parentElement?.getBoundingClientRect()) || {
      top: 0,
      left: 0,
      ...frameSettings,
    };
    const bcr = selectedElement.element.getBoundingClientRect();

    return {
      bounds: {
        top: pbcr.top,
        left: pbcr.left,
        width: pbcr.width,
        height: pbcr.height,
      },
      dimensions: bcr && {
        top: bcr.top - pbcr.top,
        left: bcr.left - pbcr.left,
        width: bcr.width,
        height: bcr.height,
      },
    };
  };
  const recalculateBoundsObservable = useRef(new Subject<number>());
  const boundsRenderCounterRef = useRef(0);
  const recalcBounds = () => {
    console.log("recalcBounds");
    recalculateBoundsObservable.current.next(boundsRenderCounterRef.current++);
  };
  useObservableCallback(addTempStylesObservable, recalcBounds);
  useEffect(recalcBounds, [selectedElement]);

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
        <Draggable
          className="border-2 border-blue-600 border-solid pulsing-highlight"
          element={selectedElement?.element}
          calculateBoundingBox={calculateBoundingBox}
          recalculateBoundsObservable={recalculateBoundsObservable.current}
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
            onResizeSelection(finalWidth, finalHeight, deltaWidth, deltaHeight);
          }}
        />
      )}
      {(selectedElement?.overlayWarnings.length || 0) > 0 ? (
        <div
          className="absolute top-0 cursor-pointer"
          style={{ right: -20 }}
          onClick={() =>
            enqueueSnackbar(
              selectedElement!.overlayWarnings.map((s) => (
                <>
                  {s}
                  <br />
                </>
              )),
              {
                variant: "warning",
              }
            )
          }
        >
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-gray-500"
          />
        </div>
      ) : null}
    </div>
  );
  return [renderOverlay] as const;
}
