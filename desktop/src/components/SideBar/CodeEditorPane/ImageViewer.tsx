import React, { FunctionComponent, useEffect, useRef } from "react";
import mime from "mime";

import { CodeEntry } from "synergy/src/lib/project/CodeEntry";

const fs = __non_webpack_require__("fs") as typeof import("fs");

interface Props {
  codeEntry: CodeEntry;
}
export const ImageViewer: FunctionComponent<Props> = ({ codeEntry }) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const blob = new Blob(
      [fs.readFileSync(codeEntry.filePath.getNativePath())],
      {
        type: mime.getType(codeEntry.filePath.getNativePath()) || "image/jpeg",
      }
    );
    const url = URL.createObjectURL(blob);
    imgRef.current!.src = url;
    return () => URL.revokeObjectURL(url);
  }, [codeEntry.filePath]);

  return <img ref={imgRef} alt={codeEntry.filePath.getNativePath()} />;
};
