import React, {
  MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSnackbar } from "notistack";
import { Observable, Subject } from "rxjs";

import { SelectModeCursor, SelectModeType } from "../../constants";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { Project } from "../../lib/project/Project";
import { isDefined } from "../../lib/utils";
import {
  FrameSettings,
  onMoveResizeCallback,
  OutlineElement,
  ViewContext,
} from "../../types/paint";
import {
  ifSelectedElementTarget_Component,
  isSelectedElementTarget_Component,
  SelectedElement,
} from "../../types/selected-element";
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
  outlineHover?: OutlineElement,
  selectModeType?: SelectModeType,
  onSelect?: (componentElement: Element | null | undefined) => void,
  onMoveResizeSelection?: onMoveResizeCallback
) {
  const { enqueueSnackbar } = useSnackbar();
  const [elementHover, setElementHover] = useState<Element>();
  const highlightBox = useMemo(() => {
    const elements = elementHover
      ? [elementHover]
      : outlineHover?.closestElements || [];
    if (elements.length === 0) return null;

    const firstRect = elements[0]!.getBoundingClientRect();
    const rect = {
      top: firstRect.top,
      left: firstRect.left,
      width: firstRect.width,
      height: firstRect.height,
    };

    // aggregate the highlight box if there are multiple elements
    for (let i = 1; i < elements.length; i++) {
      const rect2 = elements[i]!.getBoundingClientRect();
      rect.width =
        Math.max(rect.left + rect.width, rect2.left + rect2.width) - rect.left;
      rect.height =
        Math.max(rect.top + rect.height, rect2.top + rect2.height) - rect.top;
      rect.left = Math.min(rect.left, rect2.left);
      rect.top = Math.min(rect.top, rect2.top);
    }

    return rect;
  }, [elementHover, outlineHover]);

  const onOverlayMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElement = getBestElementFromEvent(
      project,
      event,
      viewContext,
      scaleRef.current
    );

    setElementHover(componentElement);
  };
  const onOverlayClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    console.log("onOverlayClick", Date.now() - lastDragResizeHandled);
    setElementHover(undefined);
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
    if (!isSelectedElementTarget_Component(selectedElement)) return {};

    const { element, computedStyles } = selectedElement.target;
    const pbcr = (computedStyles.position === "static" &&
      element.parentElement?.getBoundingClientRect()) || {
      top: 0,
      left: 0,
      ...frameSettings,
    };
    const bcr = element.getBoundingClientRect();

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
        cursor: isDefined(selectModeType)
          ? SelectModeCursor[selectModeType]
          : undefined,
        display:
          !isDefined(selectModeType) &&
          !isSelectedElementTarget_Component(selectedElement) &&
          !highlightBox
            ? "none"
            : undefined,
      }}
      onMouseMove={selectEnabled ? onOverlayMove : undefined}
      onMouseLeave={() => setElementHover(undefined)}
      onClick={onOverlayClick}
    >
      {highlightBox ? (
        <div
          className="absolute border-blue-300 border-solid pointer-events-none"
          style={{
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height,
            borderWidth: "4px",
          }}
        />
      ) : (
        <Draggable
          className="border-4 border-blue-600 border-solid pulsing-highlight"
          element={
            ifSelectedElementTarget_Component(selectedElement)?.target.element
          }
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
