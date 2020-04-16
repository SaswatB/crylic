import { useState } from "react";

const { dialog } = (__non_webpack_require__(
  "electron"
) as typeof import("electron")).remote;

export const openFilePicker = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
  });

  return canceled ? null : filePaths[0];
};

export function useFilePicker() {
  const [filePath, setFilePath] = useState<string>();
  return [
    filePath,
    () => openFilePicker().then((f) => f && setFilePath(f)),
  ] as const;
}
