import React, { FunctionComponent, useEffect, useRef } from "react";

import { CodeEntry } from "../../types/paint";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const send = __non_webpack_require__("send");

interface Props {
  codeEntry: CodeEntry;
}
export const ImageViewer: FunctionComponent<Props> = ({ codeEntry }) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const blob = new Blob([fs.readFileSync(codeEntry.filePath)], {
      type: send.mime.lookup(codeEntry.filePath) || "image/jpeg",
    });
    const url = URL.createObjectURL(blob);
    imgRef.current!.src = url;
    return () => URL.revokeObjectURL(url);
  }, [codeEntry.filePath]);

  return <img ref={imgRef} alt={codeEntry.filePath} />;
};
