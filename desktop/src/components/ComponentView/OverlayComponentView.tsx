import React, {
  FunctionComponent,
  MutableRefObject,
  RefAttributes,
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
import { Subject } from "rxjs";

import { IconButton } from "synergy/src/components/IconButton";
import { ResizeModal } from "synergy/src/components/ResizeModal";
import { useDebounce } from "synergy/src/hooks/useDebounce";
import { useMenuInput } from "synergy/src/hooks/useInput";
import { useObservable } from "synergy/src/hooks/useObservable";
import { StyleGroup } from "synergy/src/lib/ast/editors/ASTEditor";
import { RouteDefinition } from "synergy/src/lib/react-router-proxy";
import { Styles } from "synergy/src/types/paint";

import { useOverlay } from "../../hooks/useOverlay";
import { SelectedElement } from "../../types/paint";
import {
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_WIDTH,
  SelectModeType,
} from "../../utils/constants";
import { BuildProgress } from "../BuildProgress";
import {
  CompileContext,
  CompilerComponentView,
  CompilerComponentViewProps,
  CompilerComponentViewRef,
  ViewContext,
} from "./CompilerComponentView";

interface Props {
  compilerProps: CompilerComponentViewProps &
    React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>;
  scaleRef: MutableRefObject<number>;
  selectModeType: SelectModeType | undefined;
  selectedElement: SelectedElement | undefined;
  onSelectElement: (
    renderId: string,
    element: HTMLElement,
    componentView: CompilerComponentViewRef
  ) => void;
  updateSelectedElementStyles: (
    styleGroup: StyleGroup,
    styles: Styles,
    preview?: boolean
  ) => void;
  onAddRoute: (routeDefinition: RouteDefinition) => void;
  onCurrentRouteChange: (route: string) => void;
  onTogglePublish: () => void;
  onRemoveComponentView: () => void;
}

export const OverlayComponentView: FunctionComponent<Props> = ({
  compilerProps,
  scaleRef,
  selectModeType,
  selectedElement,
  onSelectElement,
  updateSelectedElementStyles,
  onAddRoute,
  onCurrentRouteChange,
  onTogglePublish,
  onRemoveComponentView,
}) => {
  const [loading, setLoading] = useState(false);
  const [debouncedLoading, skipLoadingDebounce] = useDebounce(loading, 700);
  const componentView = useRef<CompilerComponentViewRef>();

  const [frameSize, setFrameSize] = useState({
    width: DEFAULT_FRAME_WIDTH,
    height: DEFAULT_FRAME_HEIGHT,
  });

  // event for when temp styles are applied to the selected component
  const addTempStylesObservableRef = useRef(new Subject());

  const [renderOverlay] = useOverlay(
    compilerProps.project,
    componentView.current,
    frameSize,
    addTempStylesObservableRef.current,
    scaleRef,
    selectedElement,
    selectModeType,
    (componentElement) =>
      componentElement &&
      componentView.current &&
      onSelectElement(
        compilerProps.renderEntry.id,
        componentElement as HTMLElement,
        componentView.current
      ),
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
      const styles: Styles = [];
      if (deltaX || totalDeltaX) {
        const currentMarginLeft = parseInt(
          selectedElement?.computedStyles.marginLeft.replace("px", "") || "0"
        );
        const newMarginLeft = (currentMarginLeft + deltaX!).toFixed(0);
        styles.push({
          styleName: "marginLeft",
          styleValue: `${newMarginLeft}px`,
        });
      }
      if (deltaY || totalDeltaY) {
        const currentMarginTop = parseInt(
          selectedElement?.computedStyles.marginTop.replace("px", "") || "0"
        );
        const newMarginTop = (currentMarginTop + deltaY!).toFixed(0);
        styles.push({
          styleName: "marginTop",
          styleValue: `${newMarginTop}px`,
        });
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
        styles.push({
          styleName: "width",
          styleValue: effectiveWidth,
        });
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
        styles.push({
          styleName: "height",
          styleValue: effectiveHeight,
        });
      }
      // todo take style group from sidebar
      updateSelectedElementStyles(
        selectedElement!.styleGroups[0],
        styles,
        preview
      );
    }
  );

  const [compileContext, setCompileContext] = useState<CompileContext>();
  const [viewContext, setViewContext] = useState<ViewContext>();

  const routeDefinition = useObservable(viewContext?.onRoutesDefined);
  const currentRoute = useObservable(viewContext?.onRouteChange);

  // persist any route changes to keep it between compilations
  useEffect(() => {
    if (currentRoute && compilerProps.renderEntry.route !== currentRoute) {
      onCurrentRouteChange(currentRoute);
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
        {compilerProps.renderEntry.name}
        <div className="flex-1" />
        {routeDefinition?.routes ? (
          <>
            <IconButton
              title="Add Route"
              icon={faPlus}
              onClick={() => onAddRoute(routeDefinition)}
            />
            <IconButton
              title="Switch Route"
              className="ml-2"
              icon={faLink}
              onClick={openRouteMenu}
            />
          </>
        ) : null}
        {/* <IconButton
          title={
            compilerProps.renderEntry.publish
              ? "Stop browser viewer"
              : "View in Browser"
          }
          className="ml-2"
          icon={faGlobe}
          iconProps={{
            style: compilerProps.renderEntry.publish
              ? { color: "#43a047" }
              : undefined,
          }}
          onClick={onTogglePublish}
        /> */}
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
          ref={(newComponentViewRef) => {
            componentView.current = newComponentViewRef ?? undefined;
            if (compilerProps.ref) {
              const refProxy = newComponentViewRef
                ? {
                    ...newComponentViewRef,
                    addTempStyles(
                      lookupId: string,
                      styles: Styles,
                      persisteRender: boolean
                    ) {
                      newComponentViewRef.addTempStyles(
                        lookupId,
                        styles,
                        persisteRender
                      );
                      addTempStylesObservableRef.current.next();
                    },
                  }
                : null;
              if (typeof compilerProps.ref === "function") {
                compilerProps.ref(refProxy);
              } else {
                // @ts-ignore ignore readonly error
                compilerProps.ref.current = refProxy;
              }
            }
          }}
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
        {(selectModeType !== undefined || selectedElement) && renderOverlay()}
        {debouncedLoading && <BuildProgress compileContext={compileContext} />}
      </div>
    </div>
  );
};