import { useState } from 'react';

const {dialog} = (__non_webpack_require__('electron') as typeof import('electron')).remote;

export function useFilePicker() {
  const [filePath, setFilePath] = useState<string>();
  const openFilePicker = async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile']
    });
    if (!canceled) setFilePath(filePaths[0])
  }
  return [filePath, openFilePicker] as const;
}