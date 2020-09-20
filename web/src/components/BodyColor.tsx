import { FunctionComponent, useEffect } from "react";

let index = 0;
export const BodyColor: FunctionComponent<{ className: string }> = ({
  className,
}) => {
  useEffect(() => {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.top = "0px";
    div.style.bottom = "0px";
    div.style.left = "0px";
    div.style.right = "0px";
    div.style.opacity = "1";
    div.style.transition = "opacity 300ms";
    div.style.zIndex = `${--index}`;
    div.className = className;
    document.querySelector("body")?.appendChild(div);
    return () => {
      div.style.opacity = "0";
      setTimeout(() => {
        document.querySelector("body")?.removeChild(div);
      }, 300);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};
