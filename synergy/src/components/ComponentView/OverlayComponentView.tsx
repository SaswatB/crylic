import React, {
  FunctionComponent,
  MutableRefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  faExpandAlt,
  faGlobe,
  faLink,
  faPlus,
  faSync,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { snakeCase } from "lodash";
import { useSnackbar } from "notistack";
import { Subject } from "rxjs";
import { useBus } from "ts-bus/react";

import {
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_WIDTH,
  SelectModeType,
} from "../../constants";
import { useCompilerContextRecoil } from "../../hooks/recoil/useCompilerContextRecoil";
import { addElementHelper } from "../../hooks/recoil/useProjectRecoil/code-edit-helpers";
import { useProjectRecoil } from "../../hooks/recoil/useProjectRecoil/useProjectRecoil";
import { useSelectRecoil } from "../../hooks/recoil/useSelectRecoil";
import { useDebounce } from "../../hooks/useDebounce";
import { useMenuInput } from "../../hooks/useInput";
import { useObservable } from "../../hooks/useObservable";
import { routeComponent } from "../../lib/defs/react-router-dom";
import { componentViewRouteChange } from "../../lib/events";
import { isDefined } from "../../lib/utils";
import { Styles, ViewContext } from "../../types/paint";
import { IconButton } from "../IconButton";
import { InputModal } from "../InputModal";
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
  const { project } = useProjectRecoil();
  const {
    selectMode,
    setSelectMode,
    selectedElement,
    selectElement,
    updateSelectedStyleGroup,
  } = useSelectRecoil();
  const { addCompileTask } = useCompilerContextRecoil();
  const { enqueueSnackbar } = useSnackbar();
  const { renderEntry } = compilerProps;
  const [viewContext, setViewContext] = useState<ViewContext>();

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
        const lookupId = project?.primaryElementEditor.getLookupIdFromHTMLElement(
          componentElement
        );
        console.log("setting selected from manual selection", lookupId);
        if (lookupId) selectElement(renderId, lookupId);
        break;
      case SelectModeType.AddElement:
        try {
          addElementHelper(project!, componentElement, selectMode, {
            renderId,
            addCompileTask,
            selectElement,
          });
        } catch (e) {
          enqueueSnackbar((e as Error)?.message || `${e}`);
        }
        break;
    }

    setSelectMode(undefined);
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
      updateSelectedStyleGroup(styles, preview);
    }
  );

  const [compileContext, setCompileContext] = useState<CompileContext>();

  const routeDefinition = useObservable(viewContext?.onRoutesDefined);
  const currentRoute = useObservable(viewContext?.onRouteChange);

  const onAddRoute = async () => {
    const inputName = await InputModal({
      title: "New Route",
      message: "Please enter a route name",
    });
    if (!inputName) return;
    // todo show preview of name in dialog
    const name = snakeCase(inputName.replace(/[^a-z0-9]/g, ""));
    const path = `/${name}`;
    const switchLookupId = project!.primaryElementEditor.getLookupIdFromProps(
      routeDefinition!.switchProps
    )!;
    await addElementHelper(project!, switchLookupId, {
      component: routeComponent,
      attributes: { path },
    });
    project!.editRenderEntry(renderEntry.id, { route: path });
  };

  const onTogglePublish = () => {
    console.log("onTogglePublish");
    project?.editRenderEntry(renderEntry.id, {
      publish: !renderEntry.publish,
    });
  };

  const onRemoveComponentView = () =>
    project?.removeRenderEntry(renderEntry.id);

  // fire an event whenever the route changes
  useEffect(() => {
    if (currentRoute && renderEntry.route !== currentRoute) {
      bus.publish(
        componentViewRouteChange({
          renderEntry,
          route: currentRoute,
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoute]);

  const [, renderRouteMenu, openRouteMenu, closeRouteMenu] = useMenuInput({
    options: (routeDefinition?.routes || []).map((availableRoute) => ({
      name: availableRoute,
      value: availableRoute,
    })),
    disableSelection: true,
    onChange: (newRoute) => {
      closeRouteMenu();
      routeDefinition?.historyRef.current.push(newRoute);
    },
    initialValue: currentRoute,
  });

  return (
    <div className="flex flex-col m-10">
      <div className="flex relative px-3 py-1 bg-blue-900 opacity-50 hover:opacity-100 default-transition">
        {renderEntry.name}
        <div className="flex-1" />
        {routeDefinition?.routes ? (
          <>
            <IconButton title="Add Route" icon={faPlus} onClick={onAddRoute} />
            <IconButton
              title="Switch Route"
              className="ml-2"
              icon={faLink}
              onClick={openRouteMenu}
            />
          </>
        ) : null}
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
          onClick={() => viewContext?.iframe.contentWindow?.location.reload()}
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
        {renderRouteMenu()}
        {currentRoute && (
          <div className="absolute inset-0 text-center pointer-events-none">
            <div
              className="inline-block truncate py-1 font-bold pointer-events-auto"
              style={{ maxWidth: "100px" }}
              title={`Route: ${currentRoute}`}
            >
              {currentRoute}
            </div>
          </div>
        )}
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
