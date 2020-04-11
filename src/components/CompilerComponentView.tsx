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
import { DIV_LOOKUP_DATA_ATTR } from "../utils/constants";
import { babelRunCode } from "../utils/run-code-babel";

const webpack = __non_webpack_require__('webpack') as typeof import('webpack');

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
    if (code) {
      try {
        console.log("compiled!");
        const codeExports = babelRunCode(filePath, code);
        setCompiledElement(() =>
          Object.values(codeExports).find(
            (e): e is Function => typeof e === "function"
          )
        );

        if (errorBoundary.current?.hasError()) {
          errorBoundary.current.resetError();
        }
      } catch (e) {
        console.log(e);
      }
    }
  }, [filePath, code]);

  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({
    getElementAtPoint(x, y) {
      return frame.current?.contentDocument?.elementFromPoint(x, y);
    },
    getElementByLookupId(lookUpId) {
      return frame.current?.contentDocument?.querySelector(
        `[data-${DIV_LOOKUP_DATA_ATTR}="${lookUpId}"]`
      );
    },
  }));

  return (
    <Frame {...props} ref={frame}>
      <ErrorBoundary
        ref={errorBoundary}
        onError={(error, errorInfo) => {
          console.log(error, errorInfo);
        }}
      >
        {CompiledElement && <CompiledElement />}
      </ErrorBoundary>
    </Frame>
  );
});
