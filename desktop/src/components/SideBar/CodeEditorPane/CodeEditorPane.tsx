import React, { FunctionComponent, useEffect, useState } from "react";

import { useProjectRecoil } from "synergy/src/hooks/recoil/useProjectRecoil/useProjectRecoil";
import { useSelectRecoil } from "synergy/src/hooks/recoil/useSelectRecoil";
import { useBusSubscription } from "synergy/src/hooks/useBusSubscription";
import { editorOpenLocation } from "synergy/src/lib/events";
import {
  getFriendlyName,
  isDefined,
  isImageEntry,
} from "synergy/src/lib/utils";

import { CodeEditor } from "./CodeEditor";
import { CodeEditorTabs } from "./CodeEditorTabs";
import { ImageViewer } from "./ImageViewer";

export const CodeEditorPane: FunctionComponent = () => {
  const { project, toggleCodeEntryEdit, setCode } = useProjectRecoil();
  const { selectedElement } = useSelectRecoil();
  const [activeTab, setActiveTab] = useState(0);

  // get all the code entries being edited
  const editableEntries = project?.editEntries
    .map((e) => project.getCodeEntry(e.codeId))
    .filter(isDefined);

  // switch to the editor that the selected element belongs to when it's selected
  useEffect(() => {
    if (selectedElement?.lookupId) {
      const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
        selectedElement?.lookupId
      );
      const codeIndex =
        editableEntries?.findIndex((entry) => entry.id === codeId) ?? -1;
      if (codeIndex !== -1 && codeIndex !== activeTab) {
        setActiveTab(codeIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.lookupId]);

  // listen for editor open requests
  useBusSubscription(editorOpenLocation, ({ codeEntry }) => {
    const editorIndex =
      editableEntries?.findIndex((e) => e.id === codeEntry.id) ?? -1;
    if (editorIndex !== -1 && activeTab !== editorIndex) {
      setActiveTab(editorIndex);
    }
  });

  return (
    <CodeEditorTabs
      activeTab={activeTab}
      onChange={setActiveTab}
      tabs={editableEntries?.map((codeEntry, index) => ({
        key: codeEntry.id,
        name: getFriendlyName(project!, codeEntry.id),
        title: codeEntry.filePath,
        render: () =>
          isImageEntry(codeEntry) ? (
            <ImageViewer codeEntry={codeEntry} />
          ) : (
            <CodeEditor
              project={project!}
              codeEntry={codeEntry}
              onCodeChange={(id, code) => setCode(() => ({ id, code }))}
              selectedElementId={selectedElement?.lookupId}
              onSelectElement={(lookupId) => {
                // todo reenable
                // const newSelectedComponent = Object.values(componentViews.current)
                //   .map((componentView) =>
                //     componentView?.getElementsByLookupId(lookupId)
                //   )
                //   .filter((e) => !!e)[0];
                // if (newSelectedComponent) {
                //   console.log(
                //     "setting selected element through editor cursor update",
                //     project?.primaryElementEditor.getLookupIdFromHTMLElement(
                //       newSelectedComponent as HTMLElement
                //     )
                //   );
                //   selectElement(newSelectedComponent as HTMLElement);
                // }
              }}
              isActiveEditor={activeTab === index}
            />
          ),
        onClose: () => toggleCodeEntryEdit(codeEntry),
      }))}
    />
  );
};
