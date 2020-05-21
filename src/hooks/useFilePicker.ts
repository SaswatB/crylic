import { useState } from "react";

const { dialog } = (__non_webpack_require__(
  "electron"
) as typeof import("electron")).remote;

export const openFilePicker = async (options?: Electron.OpenDialogOptions) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    ...options,
  });

  return canceled ? null : filePaths[0];
};

export const saveFilePicker = async (options?: Electron.SaveDialogOptions) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    properties: ["createDirectory"],
    ...options,
  });

  return canceled ? null : filePath;
};

export function useFilePicker() {
  const [filePath, setFilePath] = useState<string>();
  return [
    filePath,
    () => openFilePicker().then((f) => f && setFilePath(f)),
  ] as const;
}
