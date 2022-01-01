import { useState } from "react";

const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

export const openFilePicker = async (options?: Electron.OpenDialogOptions) => {
  const { canceled, filePaths } = await ipcRenderer.invoke("showOpenDialog", {
    properties: ["openFile"],
    ...options,
  });

  return canceled ? null : filePaths[0];
};

export const saveFilePicker = async (options?: Electron.SaveDialogOptions) => {
  const { canceled, filePath } = await ipcRenderer.invoke("showSaveDialog", {
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
