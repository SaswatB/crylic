import { FunctionComponent, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useBusSubscription } from "../../hooks/useBusSubscription";
import { useService } from "../../hooks/useService";
import {
  componentViewCompileEnd,
  componentViewReload,
  componentViewRouteChange,
} from "../../lib/events";
import { sleep } from "../../lib/utils";
import { CompilerContextService } from "../../services/CompilerContextService";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";

export const StateManager: FunctionComponent = () => {
  const project = useProject({ allowUndefined: true });
  const selectService = useService(SelectService);
  const compilerContextService = useService(CompilerContextService);

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
  useHotkeys("escape", () => selectService.setSelectMode(undefined));

  useHotkeys(
    "delete",
    () =>
      void selectService
        .deleteSelectedElement()
        .catch((e) => alert((e as Error).message))
  );

  /* Project Management */

  // onASTRender callback for all project editor entries
  useBusSubscription(componentViewCompileEnd, ({ viewContext }) => {
    project?.editorEntries.forEach(({ editor }) =>
      editor.onASTRender?.(viewContext.iframe)
    );
  });

  // persist route changes in the project
  useBusSubscription(componentViewRouteChange, ({ renderEntry, route }) => {
    project?.editRenderEntry(renderEntry.id, { route });
  });

  /* Select Management */

  // clear the selected element if the component view changes its route
  useBusSubscription(componentViewRouteChange, ({ renderEntry }) => {
    if (selectService.selectedElement$.getValue()?.renderId === renderEntry.id)
      selectService.clearSelectedElement();
  });

  // refresh the selected element when the iframe reloads, if possible
  useBusSubscription(componentViewReload, async ({ renderEntry }) => {
    const selectedElement = selectService.selectedElement$.getValue();
    if (selectedElement?.renderId !== renderEntry.id) return;
    let newSelectedComponent = undefined;
    for (let i = 0; i < 5 && !newSelectedComponent; i++) {
      newSelectedComponent = compilerContextService
        .getViewContext(renderEntry.id)
        ?.getElementsByLookupId(selectedElement.lookupId)[0];
      if (!newSelectedComponent) await sleep(100);
    }

    if (newSelectedComponent) {
      console.log(
        "setting selected element post-iframe reload",
        selectedElement.lookupId
      );
      selectService.selectElement(renderEntry.id, selectedElement);
    } else {
      console.log(
        "unable to reselect selected element post-iframe reload",
        selectedElement.lookupId
      );
      selectService.clearSelectedElement();
    }
  });

  // clear the selected element if the project was closed
  useEffect(() => {
    if (!project) selectService.clearSelectedElement();
  }, [project, selectService]);

  return null;
};
