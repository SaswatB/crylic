import React, {
  forwardRef,
  FunctionComponent,
  RefAttributes,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";

// @ts-ignore ignore raw loader import
// eslint-disable-next-line import/no-webpack-loader-syntax
import normalizeCss from "!!raw-loader!normalize.css/normalize.css";

export interface FrameRef {
  frameElement: HTMLIFrameElement;
}

export const Frame: FunctionComponent<
  React.IframeHTMLAttributes<HTMLIFrameElement> & RefAttributes<FrameRef>
> = forwardRef(({ children, ...props }, ref) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [root, setRoot] = useState<HTMLDivElement>();

  const resetFrame = () => {
    const iframeDocument = frame.current?.contentDocument;
    if (iframeDocument?.readyState !== "complete") {
      setTimeout(resetFrame, 10);
      return;
    }

    // clear the iframe content
    iframeDocument.write("");
    iframeDocument.close();

    // add react rendering root
    const newRoot = iframeDocument.createElement("div");
    newRoot.style.width = "100%";
    newRoot.style.height = "100%";
    iframeDocument.body.appendChild(newRoot);
    setRoot(newRoot);

    // add normalize
    const style = iframeDocument.createElement("style");
    iframeDocument.head.appendChild(style);
    style.type = "text/css";
    style.appendChild(iframeDocument.createTextNode(normalizeCss));
  };
  useEffect(() => {
    resetFrame();
    frame.current!.onload = resetFrame;
    return () => {
      frame.current!.onload = null;
    };
  }, []);

  useEffect(() => {
    if (root) {
      ReactDOM.render(
        // @ts-ignore children typecheck failure
        children,
        root
      );
    }
  }, [children, root]);

  useImperativeHandle(ref, () => ({
    frameElement: frame.current!,
  }));

  // @ts-ignore ignore ref that's overridden by useImperativeHandle
  return <iframe ref={frame} title="frame" {...props} />;
});
