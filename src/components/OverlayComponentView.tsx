import React, {
  FunctionComponent,
  RefAttributes,
  useRef,
  useState,
} from "react";
import { CircularProgress } from "@material-ui/core";

import { useDebounce } from "../hooks/useDebounce";
import { useOverlay } from "../hooks/useOverlay";
import { SelectedElement, Styles } from "../types/paint";
import { SelectModeType } from "../utils/constants";
import {
  CompilerComponentView,
  CompilerComponentViewProps,
  CompilerComponentViewRef,
} from "./CompilerComponentView";

interface Props {
  compilerProps: CompilerComponentViewProps &
    React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>;
  selectModeType: SelectModeType | undefined;
  selectedElement: SelectedElement | undefined;
  onSelectElement: (
    element: HTMLElement,
    componentView: CompilerComponentViewRef
  ) => void;
  updateSelectedElementStyles: (styles: Styles, preview?: boolean) => void;
}

export const OverlayComponentView: FunctionComponent<Props> = ({
  compilerProps,
  selectModeType,
  selectedElement,
  onSelectElement,
  updateSelectedElementStyles,
}) => {
  const [loading, setLoading] = useState(false);
  const [debouncedLoading, skipLoadingDebounce] = useDebounce(loading, 700);
  const componentView = useRef<CompilerComponentViewRef>();

  const [renderOverlay] = useOverlay(
    componentView.current,
    selectedElement,
    selectModeType,
    (componentElement) =>
      componentElement &&
      componentView.current &&
      onSelectElement(componentElement as HTMLElement, componentView.current),
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
      if (width)
        styles.push({
          styleName: "width",
          styleValue: width,
        });
      if (height)
        styles.push({
          styleName: "height",
          styleValue: height,
        });
      updateSelectedElementStyles(styles, preview);
    }
  );

  return (
    <>
      <CompilerComponentView
        {...compilerProps}
        ref={(newComponentViewRef) => {
          componentView.current = newComponentViewRef ?? undefined;
          if (compilerProps.ref) {
            if (typeof compilerProps.ref === "function") {
              compilerProps.ref(newComponentViewRef);
            } else {
              // @ts-ignore ignore readonly error
              compilerProps.ref.current = newComponentViewRef;
            }
          }
        }}
        onCompileStart={() => {
          setLoading(true);
          compilerProps?.onCompileStart?.();
        }}
        onCompileEnd={(codeId, context) => {
          skipLoadingDebounce();
          setLoading(false);
          compilerProps?.onCompileEnd?.(codeId, context);
        }}
      />
      {(selectModeType !== undefined || selectedElement) && renderOverlay()}
      {debouncedLoading && (
        <div className="flex items-center justify-center absolute inset-0 z-20 dark-glass">
          <CircularProgress />
        </div>
      )}
    </>
  );
};
