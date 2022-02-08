import React, {
  FunctionComponent,
  MutableRefObject,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  faExpandAlt,
  faGlobe,
  faSync,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useSnackbar } from "notistack";
import { Subject } from "rxjs";
import { useBus } from "ts-bus/react";

import {
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_WIDTH,
  SelectModeType,
} from "../../constants";
import { useDebounce } from "../../hooks/useDebounce";
import { useObservable } from "../../hooks/useObservable";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { useService } from "../../hooks/useService";
import { addElementHelper } from "../../lib/ast/code-edit-helpers";
import { componentDomChange } from "../../lib/events";
import { isDefined } from "../../lib/utils";
import { CompilerContextService } from "../../services/CompilerContextService";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { Styles, ViewContext } from "../../types/paint";
import { IconButton } from "../IconButton";
import { ResizeModal } from "../ResizeModal";
import { BuildProgress } from "./BuildProgress";
import {
  CompileContext,
  CompilerComponentView,
  CompilerComponentViewProps,
} from "./CompilerComponentView";
import { useOverlay } from "./useOverlay";

function assertHTMLElement(e: Element): asserts e is HTMLElement {}

interface Props {
  compilerProps: CompilerComponentViewProps &
    React.IframeHTMLAttributes<HTMLIFrameElement>;
  scaleRef: MutableRefObject<number>;
  enablePublish?: boolean;
}

export const OverlayComponentView: FunctionComponent<Props> = ({
  compilerProps,
  scaleRef,
  enablePublish,
}) => {
  const bus = useBus();
  const [loading, setLoading] = useState(false);
  const [debouncedLoading, skipLoadingDebounce] = useDebounce(loading, 700);
  const project = useProject();
  const selectService = useService(SelectService);
  const selectMode = useObservable(selectService.selectMode$);
  const selectedElement = useObservable(selectService.selectedElement$);
  const compilerContextService = useService(CompilerContextService);
  const { enqueueSnackbar } = useSnackbar();
  const { renderEntry } = compilerProps;
  const [viewContext, setViewContext] = useState<ViewContext>();

  const reload = useCallback(
    () => viewContext?.iframe.contentWindow?.location.reload(),
    [viewContext]
  );
  useObservableCallback(project.shouldReloadRenderEntries$, reload);

  const [frameSize, setFrameSize] = useState({
    width: DEFAULT_FRAME_WIDTH,
    height: DEFAULT_FRAME_HEIGHT,
  });

  // todo hook this back up
  // event for when temp styles are applied to the selected component
  const addTempStylesObservableRef = useRef(new Subject());

  const onOverlaySelectElement = (
    componentElement: Element | null | undefined
  ) => {
    if (!componentElement) return;
    assertHTMLElement(componentElement);
    const renderId = renderEntry.id;

    switch (selectMode?.type) {
      default:
      case SelectModeType.SelectElement:
        console.log("setting selected from manual selection", componentElement);
        selectService.selectElement(renderId, {
          htmlElement: componentElement,
        });
        break;
      case SelectModeType.AddElement:
        try {
          addElementHelper(project!, componentElement, selectMode, {
            renderId,
            addCompileTask: compilerContextService.addCompileTask.bind(
              compilerContextService
            ),
            selectElement: selectService.selectElement.bind(selectService),
          });
        } catch (e) {
          enqueueSnackbar((e as Error)?.message || `${e}`);
        }
        break;
    }

    selectService.setSelectMode(undefined);
  };

  const [renderOverlay] = useOverlay(
    project,
    viewContext,
    frameSize,
    addTempStylesObservableRef.current,
    scaleRef,
    selectedElement,
    selectMode?.type,
    onOverlaySelectElement,
    (deltaX, totalDeltaX, deltaY, totalDeltaY, width, height, preview) => {
      if (
        !deltaX &&
        !totalDeltaX &&
        !deltaY &&
        !totalDeltaY &&
        !width &&
        !height
      )
        return;
      const styles: Styles = {};
      if (deltaX || totalDeltaX) {
        const currentMarginLeft = parseInt(
          selectedElement?.computedStyles.marginLeft.replace("px", "") || "0"
        );
        const newMarginLeft = (currentMarginLeft + deltaX!).toFixed(0);
        styles["marginLeft"] = `${newMarginLeft}px`;
      }
      if (deltaY || totalDeltaY) {
        const currentMarginTop = parseInt(
          selectedElement?.computedStyles.marginTop.replace("px", "") || "0"
        );
        const newMarginTop = (currentMarginTop + deltaY!).toFixed(0);
        styles["marginTop"] = `${newMarginTop}px`;
      }
      if (width) {
        let effectiveWidth = width;
        if (
          selectedElement?.computedStyles.boxSizing === "content-box" &&
          width.includes("px")
        ) {
          let contentWidth = parseFloat(width);
          contentWidth -= parseFloat(
            selectedElement?.computedStyles.paddingLeft
          );
          contentWidth -= parseFloat(
            selectedElement?.computedStyles.paddingRight
          );
          contentWidth -= parseFloat(
            selectedElement?.computedStyles.borderLeftWidth
          );
          contentWidth -= parseFloat(
            selectedElement?.computedStyles.borderRightWidth
          );
          effectiveWidth = `${contentWidth}px`;
        }
        styles["width"] = effectiveWidth;
      }
      if (height) {
        let effectiveHeight = height;
        if (
          selectedElement?.computedStyles.boxSizing === "content-box" &&
          height.includes("px")
        ) {
          let contentHeight = parseFloat(height);
          contentHeight -= parseFloat(
            selectedElement?.computedStyles.paddingTop
          );
          contentHeight -= parseFloat(
            selectedElement?.computedStyles.paddingBottom
          );
          contentHeight -= parseFloat(
            selectedElement?.computedStyles.borderTopWidth
          );
          contentHeight -= parseFloat(
            selectedElement?.computedStyles.borderBottomWidth
          );
          effectiveHeight = `${contentHeight}px`;
        }
        styles["height"] = effectiveHeight;
      }
      selectService.updateSelectedStyleGroup(styles, preview);
    }
  );

  const [compileContext, setCompileContext] = useState<CompileContext>();

  const onTogglePublish = () => {
    console.log("onTogglePublish");
    project?.editRenderEntry(renderEntry.id, {
      publish: !renderEntry.publish,
    });
  };

  const onRemoveComponentView = () =>
    project?.removeRenderEntry(renderEntry.id);

  return (
    <div className="flex flex-col m-10">
      <div className="flex relative px-3 py-1 bg-blue-900 opacity-50 hover:opacity-100 default-transition">
        <div className="flex-1 truncate">{renderEntry.name}</div>
        <div className="flex-1" />
        {enablePublish && (
          <IconButton
            title={
              renderEntry.publish ? "Stop browser viewer" : "View in Browser"
            }
            className="ml-2"
            icon={faGlobe}
            iconProps={{
              style: renderEntry.publish ? { color: "#43a047" } : undefined,
            }}
            onClick={onTogglePublish}
          />
        )}
        <IconButton
          title="Refresh Frame"
          className="ml-2"
          icon={faSync}
          onClick={reload}
        />
        <IconButton
          title="Resize Frame"
          className="ml-2"
          icon={faExpandAlt}
          onClick={() =>
            ResizeModal({
              title: "Resize Frame",
              defaultWidth: frameSize.width,
              defaultHeight: frameSize.height,
            }).then((newSize) => newSize && setFrameSize(newSize))
          }
        />
        <IconButton
          title="Close Frame"
          className="ml-2"
          icon={faTimes}
          onClick={onRemoveComponentView}
        />
      </div>
      <div className="flex relative bg-white shadow-2xl">
        <CompilerComponentView
          {...compilerProps}
          onCompileStart={(context) => {
            setLoading(true);
            setCompileContext(context);
            compilerProps?.onCompileStart?.(context);
          }}
          onCompileEnd={(renderEntry, context) => {
            skipLoadingDebounce();
            setLoading(false);
            setViewContext(context);
            compilerProps?.onCompileEnd?.(renderEntry, context);
          }}
          onCompileError={(e) => {
            skipLoadingDebounce();
            setLoading(false);
            compilerProps?.onCompileError?.(e);
          }}
          onDomChange={() => {
            bus.publish(componentDomChange({ renderEntry }));
            compilerProps?.onDomChange?.();
          }}
          style={{
            ...compilerProps.style,
            width: `${frameSize.width}px`,
            height: `${frameSize.height}px`,
          }}
        />
        {(isDefined(selectMode) || selectedElement) && renderOverlay()}
        {debouncedLoading && <BuildProgress compileContext={compileContext} />}
      </div>
    </div>
  );
};
