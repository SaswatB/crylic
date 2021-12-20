import { FunctionComponent, useEffect } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useCompilerContextRecoil } from "../../hooks/recoil/useCompilerContextRecoil";
import { useProjectRecoil } from "../../hooks/recoil/useProjectRecoil/useProjectRecoil";
import {
  useReselectGuard,
  useSelectRecoil,
} from "../../hooks/recoil/useSelectRecoil";
import { useBusSubscription } from "../../hooks/useBusSubscription";
import {
  componentViewCompileEnd,
  componentViewReload,
  componentViewRouteChange,
} from "../../lib/events";
import { sleep } from "../../lib/utils";

export const StateManager: FunctionComponent = () => {
  const { project } = useProjectRecoil();
  const {
    setSelectMode,
    selectedElement,
    selectElement,
    clearSelectedElement,
  } = useSelectRecoil();
  const { getViewContext } = useCompilerContextRecoil();

  /* Hotkeys */

  // handle save/undo/redo hotkeys
  useHotkeys("ctrl+s", () => project?.saveFiles());
  useHotkeys("ctrl+z", () => project?.undoCodeChange());
  useHotkeys("ctrl+shift+z", () => project?.redoCodeChange());

  // clear select mode on escape hotkey
  useHotkeys("escape", () => setSelectMode(undefined));

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

  // try to handle selectedElement being removed from and readded to the DOM
  useReselectGuard();

  // clear the selected element if the component view changes its route
  useBusSubscription(componentViewRouteChange, ({ renderEntry }) => {
    if (selectedElement?.renderId === renderEntry.id) clearSelectedElement();
  });

  // refresh the selected element when the iframe reloads, if possible
  useBusSubscription(componentViewReload, async ({ renderEntry }) => {
    if (selectedElement?.renderId !== renderEntry.id) return;
    let newSelectedComponent = undefined;
    for (let i = 0; i < 5 && !newSelectedComponent; i++) {
      newSelectedComponent = getViewContext(
        renderEntry.id
      )?.getElementsByLookupId(selectedElement.lookupId)[0];
      if (!newSelectedComponent) await sleep(100);
    }

    if (newSelectedComponent) {
      console.log(
        "setting selected element post-iframe reload",
        selectedElement.lookupId
      );
      selectElement(renderEntry.id, selectedElement.lookupId);
    } else {
      console.log(
        "unable to reselect selected element post-iframe reload",
        selectedElement.lookupId
      );
      clearSelectedElement();
    }
  });

  // clear the selected element if the project was closed
  useEffect(() => {
    if (!project) clearSelectedElement();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!project]);

  return null;
};
