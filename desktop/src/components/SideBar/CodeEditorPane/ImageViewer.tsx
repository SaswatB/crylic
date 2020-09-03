import React, { FunctionComponent, useEffect, useRef } from "react";
import mime from "mime";

import { CodeEntry } from "synergy/src/types/paint";

const fs = __non_webpack_require__("fs") as typeof import("fs");

interface Props {
  codeEntry: CodeEntry;
}
export const ImageViewer: FunctionComponent<Props> = ({ codeEntry }) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const blob = new Blob([fs.readFileSync(codeEntry.filePath)], {
      type: mime.getType(codeEntry.filePath) || "image/jpeg",
    });
    const url = URL.createObjectURL(blob);
    imgRef.current!.src = url;
    return () => URL.revokeObjectURL(url);
  }, [codeEntry.filePath]);

  return <img ref={imgRef} alt={codeEntry.filePath} />;
};
