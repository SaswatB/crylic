import React, { FunctionComponent, useEffect, useState } from "react";

import { CodeEntry } from "../../types/paint";
import { Project } from "../../utils/Project";
import { getFriendlyName, isDefined, isImageEntry } from "../../utils/utils";
import { Editor } from "./Editor";
import { EditorTabs } from "./EditorTabs";
import { ImageViewer } from "./ImageViewer";

interface Props {
  project: Project | undefined;
  onCodeChange: (codeId: string, newCode: string) => void;
  onCloseCodeEntry: (codeEntry: CodeEntry) => void;
  selectedElementId: string | undefined;
  onSelectElement: (lookupId: string) => void;
}

export const EditorPane: FunctionComponent<Props> = ({
  project,
  onCodeChange,
  onCloseCodeEntry,
  selectedElementId,
  onSelectElement,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  // get all the code entries being edited
  const editableEntries = project?.editEntries
    .map((e) => project.getCodeEntry(e.codeId))
    .filter(isDefined);

  // switch to the editor that the selected element belongs to when it's selected
  useEffect(() => {
    if (selectedElementId) {
      const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
        selectedElementId
      );
      const codeIndex =
        editableEntries?.findIndex((entry) => entry.id === codeId) ?? -1;
      if (codeIndex !== -1 && codeIndex !== activeTab) {
        setActiveTab(codeIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  return (
    <EditorTabs
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
            <Editor
              project={project!}
              codeEntry={codeEntry}
              onCodeChange={onCodeChange}
              selectedElementId={selectedElementId}
              onSelectElement={onSelectElement}
              isActiveEditor={activeTab === index}
            />
          ),
        onClose: () => onCloseCodeEntry(codeEntry),
      }))}
    />
  );
};
