import React, {
  FunctionComponent,
  MutableRefObject,
  useCallback,
  useEffect,
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

import {
  DEFAULT_FRAME_BACKGROUND_COLOR,
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_WIDTH,
} from "../../constants";
import { useDebounce } from "../../hooks/useDebounce";
import { useObservable } from "../../hooks/useObservable";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { useService } from "../../hooks/useService";
import { RenderEntryCompileStatus } from "../../lib/project/RenderEntry";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { FrameSettings, Styles } from "../../types/paint";
import { FrameSettingsModal } from "../FrameSettingsModal";
import { IconButton } from "../IconButton";
import { BuildProgress } from "./BuildProgress";
import {
  CompilerComponentView,
  CompilerComponentViewProps,
} from "./CompilerComponentView";
import { useOverlay } from "./useOverlay";

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
  const project = useProject();
  const selectService = useService(SelectService);
  const selectMode = useObservable(selectService.selectMode$);
  const selectedElement = useObservable(selectService.selectedElement$);
  const outlineHover = useObservable(selectService.outlineHover$);
  const { enqueueSnackbar } = useSnackbar();
  const { renderEntry } = compilerProps;
  const viewContext = useObservable(renderEntry.viewContext$);

  // #region loading
  const compileStatus = useObservable(renderEntry.compileStatus$);
  const loading = [
    RenderEntryCompileStatus.PENDING,
    RenderEntryCompileStatus.IN_PROGRESS,
  ].includes(compileStatus);
  const [debouncedLoading, skipLoadingDebounce] = useDebounce(loading, 700);
  useEffect(() => {
    if (
      [
        RenderEntryCompileStatus.COMPILED,
        RenderEntryCompileStatus.ERROR,
      ].includes(compileStatus)
    )
      skipLoadingDebounce();
  }, [compileStatus, skipLoadingDebounce]);
  // #endregion

  const reload = useCallback(
    () => viewContext?.iframe.contentWindow?.location.reload(),
    [viewContext]
  );
  useObservableCallback(project.shouldReloadRenderEntries$, reload);

  const [frameSettings, setFrameSize] = useState<FrameSettings>({
    width: DEFAULT_FRAME_WIDTH,
    height: DEFAULT_FRAME_HEIGHT,
    // todo allow setting a project wide default
    backgroundColor: DEFAULT_FRAME_BACKGROUND_COLOR,
  });

  // todo hook this back up
  // event for when temp styles are applied to the selected component
  const addTempStylesObservableRef = useRef(new Subject());

  const onOverlaySelectElement = async (
    componentElement: Element | null | undefined
  ) => {
    if (!componentElement) return;
    try {
      await selectService.invokeSelectModeAction(
        renderEntry,
        componentElement as HTMLElement
      );
    } catch (e) {
      enqueueSnackbar((e as Error)?.message || `${e}`);
    }
  };

  const [renderOverlay] = useOverlay(
    project,
    viewContext,
    frameSettings,
    addTempStylesObservableRef.current,
    scaleRef,
    selectedElement?.renderEntry.id === renderEntry.id
      ? selectedElement
      : undefined,
    outlineHover?.renderId === renderEntry.id ? outlineHover : undefined,
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
      void selectService.updateSelectedStyleGroup(styles, preview);
    }
  );

  const onTogglePublish = () => {
    console.log("onTogglePublish");
    renderEntry.publish = !renderEntry.publish;
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
            FrameSettingsModal(frameSettings).then(
              (newSize) => newSize && setFrameSize(newSize)
            )
          }
        />
        <IconButton
          title="Close Frame"
          className="ml-2"
          icon={faTimes}
          onClick={onRemoveComponentView}
        />
      </div>
      <div
        className="flex relative shadow-2xl"
        style={{ backgroundColor: frameSettings.backgroundColor }}
      >
        <CompilerComponentView
          {...compilerProps}
          style={{
            ...compilerProps.style,
            width: `${frameSettings.width}px`,
            height: `${frameSettings.height}px`,
          }}
        />
        {renderOverlay()}
        {debouncedLoading && <BuildProgress renderEntry={renderEntry} />}
      </div>
    </div>
  );
};
