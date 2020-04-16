import React, {
  forwardRef,
  FunctionComponent,
  RefAttributes,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import produce from "immer";

import { CodeEntry } from "../types/paint";
import { Styles } from "../utils/ast-parsers";
import { JSX_LOOKUP_DATA_ATTR } from "../utils/constants";
import { webpackRunCode } from "../utils/run-code-webpack";
import { ErrorBoundary } from "./ErrorBoundary";
import { Frame } from "./Frame";

export const getComponentElementFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  componentView: CompilerComponentViewRef | null
) => {
  const boundingBox = (event.target as HTMLDivElement).getBoundingClientRect();
  const x = event.clientX - boundingBox.x;
  const y = event.clientY - boundingBox.y;
  return componentView?.getElementAtPoint(x, y);
};

export interface CompilerComponentViewRef {
  getElementAtPoint: (x: number, y: number) => Element | null | undefined;
  getElementByLookupId: (lookupId: string) => Element | null | undefined;
  // cleared on next compile
  addTempStyles: (lookupId: string, styles: Styles) => void;
}

interface Props {
  codeEntries: CodeEntry[];
  primaryCodeId: string;
  codeTransformer: (codeEntry: CodeEntry) => string;
  onCompileStart?: () => void;
  onCompileEnd?: () => void;
}

export const CompilerComponentView: FunctionComponent<
  Props &
    React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>
> = forwardRef(
  (
    {
      codeEntries,
      primaryCodeId,
      codeTransformer,
      onCompileStart,
      onCompileEnd,
      ...props
    },
    ref
  ) => {
    const [tempStyles, setTempStyles] = useState<Record<string, Styles>>({});
    const [activeFrame, setActiveFrame] = useState(1);
    const frame1 = useRef<{
      frameElement: HTMLIFrameElement;
      resetFrame: () => void;
    }>(null);
    const frame2 = useRef<{
      frameElement: HTMLIFrameElement;
      resetFrame: () => void;
    }>(null);

    const getElementAtPoint: CompilerComponentViewRef["getElementAtPoint"] = (
      x,
      y
    ) => {
      return getActiveFrame().current?.frameElement.contentDocument?.elementFromPoint(
        x,
        y
      );
    };
    const getElementByLookupId: CompilerComponentViewRef["getElementByLookupId"] = (
      lookupId
    ) => {
      return getActiveFrame().current?.frameElement.contentDocument?.querySelector(
        `[data-${JSX_LOOKUP_DATA_ATTR}="${lookupId}"]`
      );
    };

    const getActiveFrame = () => (activeFrame === 1 ? frame1 : frame2);
    const getInactiveFrame = () => (activeFrame === 1 ? frame2 : frame1);

    const errorBoundary = useRef<ErrorBoundary>(null);
    const [CompiledElement, setCompiledElement] = useState<any>();
    useEffect(() => {
      if (onCompileEnd) {
        // wait until the dom is fully updated so that getElementByLookupId can work with the updated view
        setTimeout(() => requestAnimationFrame(() => onCompileEnd()));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [CompiledElement]);

    useEffect(() => {
      (async () => {
        if (codeEntries.length) {
          try {
            onCompileStart?.();
            console.log("compiling");
            const codeExports = await webpackRunCode(
              codeEntries,
              primaryCodeId,
              codeTransformer,
              {
                window: getInactiveFrame().current?.frameElement.contentWindow,
              }
            );
            setTempStyles({});
            // if nothing was returned, the compilation was likely preempted
            if (!codeExports) return;

            setCompiledElement(() =>
              Object.values(codeExports).find(
                (e): e is Function => typeof e === "function"
              )
            );

            getActiveFrame().current?.resetFrame();
            setActiveFrame(activeFrame === 1 ? 2 : 1);
            if (errorBoundary.current?.hasError()) {
              errorBoundary.current.resetError();
            }
          } catch (e) {
            console.log(e);
            onCompileEnd?.();
          }
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [codeEntries]);

    const applyTempStyles = (newTempStyles: typeof tempStyles) => {
      Object.entries(newTempStyles).forEach(([lookupId, styles]) => {
        const element = getElementByLookupId(lookupId) as HTMLElement;
        console.log("applying temp styles");
        styles.forEach(({ styleName, styleValue }) => {
          // @ts-ignore ignore read-only css props
          element.style[styleName] = styleValue;
        });
      });
    };

    useLayoutEffect(() => applyTempStyles(tempStyles));

    useImperativeHandle(ref, () => ({
      getElementAtPoint,
      getElementByLookupId,
      addTempStyles: (lookupId, styles) => {
        const newTempStyles = produce(tempStyles, (draft) => {
          draft[lookupId] = [...(draft[lookupId] || []), ...styles];
        });
        applyTempStyles(newTempStyles);
        setTempStyles(newTempStyles);
      },
    }));

    const renderFrameContent = () => (
      <ErrorBoundary
        ref={errorBoundary}
        onError={(error, errorInfo) => {
          console.log(error, errorInfo);
        }}
      >
        {CompiledElement && <CompiledElement />}
      </ErrorBoundary>
    );

    return (
      <>
        <Frame
          {...props}
          style={{
            ...props.style,
            ...(activeFrame !== 1 && { display: "none" }),
          }}
          ref={frame1}
        >
          {activeFrame === 1 && renderFrameContent()}
        </Frame>
        <Frame
          {...props}
          style={{
            ...props.style,
            ...(activeFrame !== 2 && { display: "none" }),
          }}
          ref={frame2}
        >
          {activeFrame === 2 && renderFrameContent()}
        </Frame>
      </>
    );
  }
);
