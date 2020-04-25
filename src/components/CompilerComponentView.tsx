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

import { useDebounce } from "../hooks/useDebounce";
import { useUpdatingRef } from "../hooks/useUpdatingRef";
import { CodeEntry, Styles } from "../types/paint";
import { JSXASTEditor } from "../utils/ast/editors/JSXASTEditor";
import { webpackRunCodeWithWorker } from "../utils/compilers/run-code-webpack-worker";
import { ErrorBoundary } from "./ErrorBoundary";
import { Frame } from "./Frame";

export const getComponentElementFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  componentView: CompilerComponentViewRef | null | undefined
) => {
  const boundingBox = (event.target as HTMLDivElement).getBoundingClientRect();
  const x = event.clientX - boundingBox.x;
  const y = event.clientY - boundingBox.y;
  return componentView?.getElementAtPoint(x, y);
};

export type GetElementByLookupId = (
  lookupId: string
) => HTMLElement | null | undefined;

export interface CompilerComponentViewRef {
  getElementAtPoint: (x: number, y: number) => HTMLElement | null | undefined;
  getElementByLookupId: GetElementByLookupId;
  // cleared on next compile
  addTempStyles: (
    lookupId: string,
    styles: Styles,
    persistRender: boolean
  ) => void;
}

export interface CompilerComponentViewProps {
  codeEntries: CodeEntry[];
  selectedCodeId: string;
  codeTransformer: (codeEntry: CodeEntry) => string;
  onCompileStart?: () => void;
  onCompileEnd?: (
    codeId: string,
    context: {
      iframe: HTMLIFrameElement;
      getElementByLookupId: GetElementByLookupId;
    }
  ) => void;
}

export const CompilerComponentView: FunctionComponent<
  CompilerComponentViewProps &
    React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>
> = forwardRef(
  (
    {
      codeEntries,
      selectedCodeId,
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
    }>(null);
    const frame2 = useRef<{
      frameElement: HTMLIFrameElement;
    }>(null);

    const handle: CompilerComponentViewRef = {
      getElementAtPoint(x, y) {
        const iframeDocument = getActiveFrame().current?.frameElement
          .contentDocument;
        return iframeDocument?.elementFromPoint(x, y) as
          | HTMLElement
          | null
          | undefined;
      },
      getElementByLookupId(lookupId) {
        const iframeDocument = getActiveFrame().current?.frameElement
          .contentDocument;
        return (
          iframeDocument &&
          new JSXASTEditor().getHTMLElementByLookupId(iframeDocument, lookupId)
        );
      },
      addTempStyles(lookupId, styles, persistRender) {
        const newTempStyles = produce(tempStyles, (draft) => {
          draft[lookupId] = [...(draft[lookupId] || []), ...styles];
        });
        applyTempStyles(newTempStyles);
        if (persistRender) setTempStyles(newTempStyles);
      },
    };
    const handleRef = useUpdatingRef(handle);
    useImperativeHandle(ref, () => handle);

    const getActiveFrame = () => (activeFrame === 1 ? frame1 : frame2);
    const getInactiveFrame = () => (activeFrame === 1 ? frame2 : frame1);

    const errorBoundary = useRef<ErrorBoundary>(null);
    const [CompiledElement, setCompiledElement] = useState<any>();
    const [debouncedCodeEntries] = useDebounce(codeEntries, 150);
    useEffect(() => {
      (async () => {
        if (debouncedCodeEntries.length) {
          try {
            onCompileStart?.();
            console.log("compiling");
            const codeExports = await webpackRunCodeWithWorker(
              debouncedCodeEntries,
              selectedCodeId,
              codeTransformer,
              {
                window: getInactiveFrame().current?.frameElement.contentWindow,
              }
            );
            setTempStyles({});
            // if nothing was returned, the compilation was likely preempted
            if (!codeExports) return;
            console.log("codeExports", codeExports);

            setCompiledElement(() =>
              Object.values(codeExports).find(
                (e): e is Function => typeof e === "function"
              )
            );

            getActiveFrame().current?.frameElement.contentDocument?.location.reload();
            if (errorBoundary.current?.hasError()) {
              errorBoundary.current.resetError();
            }

            // wait until the dom is fully updated so that getElementByLookupId can work with the updated view
            setTimeout(() =>
              requestAnimationFrame(() =>
                onCompileEnd?.(selectedCodeId, {
                  iframe: getInactiveFrame().current!.frameElement,
                  getElementByLookupId: handleRef.current.getElementByLookupId,
                })
              )
            );

            // flip the active frame
            setActiveFrame(activeFrame === 1 ? 2 : 1);
          } catch (e) {
            console.log(e);
            onCompileEnd?.(selectedCodeId, {
              iframe: getActiveFrame().current!.frameElement,
              getElementByLookupId: handleRef.current.getElementByLookupId,
            });
          }
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedCodeEntries]);

    const applyTempStyles = (newTempStyles: typeof tempStyles) => {
      Object.entries(newTempStyles).forEach(([lookupId, styles]) => {
        const element = handle.getElementByLookupId(lookupId) as HTMLElement;
        console.log("applying temp styles");
        styles.forEach(({ styleName, styleValue }) => {
          // @ts-ignore ignore read-only css props
          element.style[styleName] = styleValue;
        });
      });
    };

    useLayoutEffect(() => applyTempStyles(tempStyles));

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
