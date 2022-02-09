import { FunctionComponent } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useService } from "../../hooks/useService";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";

export const StateManager: FunctionComponent = () => {
  const project = useProject({ allowUndefined: true });
  const selectService = useService(SelectService);

  /* Hotkeys */

  // handle save/undo/redo hotkeys
  useHotkeys(
    "ctrl+s",
    () => {
      try {
        project?.saveFiles();
      } catch (error) {
        alert(`There was an error while saving: ${(error as Error).message}`);
      }
    },
    [project]
  );
  useHotkeys("ctrl+z", () => project?.undoCodeChange(), [project]);
  useHotkeys("ctrl+shift+z", () => project?.redoCodeChange(), [project]);

  // clear select mode on escape hotkey
  useHotkeys("escape", () => {
    selectService.clearSelectedElement();
    selectService.setSelectMode(undefined);
  });

  useHotkeys(
    "delete",
    () =>
      void selectService
        .deleteSelectedElement()
        .catch((e) => alert((e as Error).message))
  );

  return null;
};
