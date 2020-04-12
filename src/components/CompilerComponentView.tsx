import React, {
  useState,
  useEffect,
  useRef,
  FunctionComponent,
  useImperativeHandle,
  forwardRef,
  RefAttributes,
} from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Frame } from "./Frame";
import { JSX_LOOKUP_DATA_ATTR } from "../utils/constants";
import { webpackRunCode } from "../utils/run-code-webpack";

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
  getElementByLookupId: (lookUpId: string) => Element | null | undefined;
}

export const CompilerComponentView: FunctionComponent<
  {
    code: string;
    filePath?: string;
    onCompiled?: () => void;
  } & React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>
> = forwardRef(({ code, filePath, onCompiled, ...props }, ref) => {
  const [activeFrame, setActiveFrame] = useState(1)
  const frame1 = useRef<{
    frameElement: HTMLIFrameElement,
    resetFrame: () => void
  }>(null);
  const frame2 = useRef<{
    frameElement: HTMLIFrameElement,
    resetFrame: () => void
  }>(null);

  const getActiveFrame = () => activeFrame === 1 ? frame1 : frame2;
  const getInactiveFrame = () => activeFrame === 1 ? frame2 : frame1;

  const errorBoundary = useRef<ErrorBoundary>(null);
  const [CompiledElement, setCompiledElement] = useState<any>();
  useEffect(() => {
    if (onCompiled) {
      // wait until the dom is fully updated so that getElementByLookupId can work with the updated view
      setTimeout(() => requestAnimationFrame(() => onCompiled()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CompiledElement]);

  useEffect(() => {
    (async () => {
      if (code) {
        try {
          console.log("compiling");
          const codeExports = await webpackRunCode(filePath, code, {
            window: getInactiveFrame().current?.frameElement.contentWindow,
          });
          setCompiledElement(() =>
            Object.values(codeExports).find(
              (e): e is Function => typeof e === "function"
            )
          );

          getActiveFrame().current?.resetFrame();
          setActiveFrame(activeFrame === 1 ? 2 : 1)
          if (errorBoundary.current?.hasError()) {
            errorBoundary.current.resetError();
          }
        } catch (e) {
          console.log(e);
        }
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, code]);

  useImperativeHandle(ref, () => ({
    getElementAtPoint(x, y) {
      return getActiveFrame().current?.frameElement.contentDocument?.elementFromPoint(x, y);
    },
    getElementByLookupId(lookUpId) {
      return getActiveFrame().current?.frameElement.contentDocument?.querySelector(
        `[data-${JSX_LOOKUP_DATA_ATTR}="${lookUpId}"]`
      );
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
      <Frame {...props} style={{...props.style, ...(activeFrame !== 1 && { display: 'none' })}} ref={frame1}>
        {activeFrame === 1 && renderFrameContent()}
      </Frame>
      <Frame {...props} style={{...props.style, ...(activeFrame !== 2 && { display: 'none' })}} ref={frame2}>
        {activeFrame === 2 && renderFrameContent()}
      </Frame>
    </>
  );
});
