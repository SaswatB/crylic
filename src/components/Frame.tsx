import React, {
  FunctionComponent,
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  RefAttributes,
} from "react";
import ReactDOM from "react-dom";
import { DIV_LOOKUP_DATA_ATTR, DIV_LOOKUP_ROOT } from "../utils/constants";
// @ts-ignore ignore raw loader import
// eslint-disable-next-line import/no-webpack-loader-syntax
import normalizeCss from "!!raw-loader!normalize.css/normalize.css";

export const Frame: FunctionComponent<
  React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<HTMLIFrameElement>
> = forwardRef(({ children, ...props }, ref) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const [root, setRoot] = useState<HTMLDivElement>();

  const initIframe = () => {
    if (frame.current) {
      const iframeDocument = frame.current.contentDocument!;
      if (iframeDocument.readyState === "complete") {
        // clear the iframe content
        iframeDocument.write("");
        iframeDocument.close();

        // add react rendering root
        const newRoot = iframeDocument.createElement("div");
        newRoot.style.display = "flex";
        newRoot.style.width = "100%";
        newRoot.style.height = "100%";
        newRoot.dataset[DIV_LOOKUP_DATA_ATTR] = DIV_LOOKUP_ROOT;
        iframeDocument.body.appendChild(newRoot);
        setRoot(newRoot);

        // add normalize
        const style = iframeDocument.createElement("style");
        iframeDocument.head.appendChild(style);
        style.type = "text/css";
        style.appendChild(iframeDocument.createTextNode(normalizeCss));
        return;
      }
    }
    setTimeout(initIframe, 10);
  };
  useEffect(initIframe, []);

  if (root) {
    ReactDOM.render(
      // @ts-ignore children typecheck failure
      children,
      root
    );
  }

  useImperativeHandle(ref, () => frame.current!);

  return <iframe ref={frame} title="frame" {...props} />;
});
