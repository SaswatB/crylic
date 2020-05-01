import React, { FunctionComponent, useEffect, useState } from "react";

import { Project } from "../../types/paint";
import { JSXASTEditor } from "../../utils/ast/editors/JSXASTEditor";
import { getFriendlyName } from "../../utils/utils";
import { Editor } from "./Editor";
import { EditorTabs } from "./EditorTabs";

interface Props {
  project: Project | undefined;
  onCodeChange: (codeId: string, newCode: string) => void;
  onCloseCodeEntry: (codeId: string) => void;
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

  const editableEntries = project?.codeEntries.filter(
    (codeEntry) => codeEntry.edit
  );

  // switch to the editor that the selected element belongs to when it's selected
  useEffect(() => {
    if (selectedElementId) {
      const codeId = new JSXASTEditor().getCodeIdFromLookupId(
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
        render: () => (
          <Editor
            project={project!}
            codeEntry={codeEntry}
            onCodeChange={(newCode) => onCodeChange(codeEntry.id, newCode)}
            selectedElementId={selectedElementId}
            onSelectElement={onSelectElement}
            isActiveEditor={activeTab === index}
          />
        ),
        onClose: () => onCloseCodeEntry(codeEntry.id),
      }))}
    />
  );
};
