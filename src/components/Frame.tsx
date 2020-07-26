import React, {
  forwardRef,
  FunctionComponent,
  RefAttributes,
  useImperativeHandle,
  useRef,
} from "react";

export interface FrameRef {
  frameElement: HTMLIFrameElement;
}

export const Frame: FunctionComponent<
  React.IframeHTMLAttributes<HTMLIFrameElement> & RefAttributes<FrameRef>
> = forwardRef(({ children, ...props }, ref) => {
  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({
    frameElement: frame.current!,
  }));

  return (
    <iframe
      // @ts-ignore ignore ref that's overridden by useImperativeHandle
      ref={frame}
      title="frame"
      {...props}
    />
  );
});
