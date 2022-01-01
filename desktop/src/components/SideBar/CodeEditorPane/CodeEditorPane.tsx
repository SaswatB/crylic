import React, { FunctionComponent, useEffect, useState } from "react";
import { combineLatest } from "rxjs";
import { distinctUntilChanged, map } from "rxjs/operators";

import { useBusSubscription } from "synergy/src/hooks/useBusSubscription";
import { useMemoObservable } from "synergy/src/hooks/useObservable";
import { useService } from "synergy/src/hooks/useService";
import { editorOpenLocation } from "synergy/src/lib/events";
import { isDefined } from "synergy/src/lib/utils";
import { useProject } from "synergy/src/services/ProjectService";
import { SelectService } from "synergy/src/services/SelectService";

import { CodeEditor } from "./CodeEditor";
import { CodeEditorTabs } from "./CodeEditorTabs";
import { ImageViewer } from "./ImageViewer";

export const CodeEditorPane: FunctionComponent = () => {
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedElementLookupId = useMemoObservable(
    () =>
      selectService.selectedElement$.pipe(
        map((e) => e?.lookupId),
        distinctUntilChanged()
      ),
    [selectService]
  );
  const [activeTab, setActiveTab] = useState(0);

  // get all the code entries being edited
  const editableEntries = useMemoObservable(
    () =>
      project &&
      combineLatest([project.editEntries$, project.codeEntries$.toRXJS()]).pipe(
        map(([editEntries, codeEntries]) =>
          editEntries
            .map((e) => codeEntries.find((c) => c.id === e.codeId))
            .filter(isDefined)
        )
      ),
    [project]
  );

  // switch to the editor that the selected element belongs to when it's selected
  useEffect(() => {
    if (selectedElementLookupId) {
      const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
        selectedElementLookupId
      );
      const codeIndex =
        editableEntries?.findIndex((entry) => entry.id === codeId) ?? -1;
      if (codeIndex !== -1 && codeIndex !== activeTab) {
        setActiveTab(codeIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementLookupId]);

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
        name: codeEntry.friendlyName,
        title: codeEntry.filePath,
        render: () =>
          codeEntry.isImageEntry ? (
            <ImageViewer codeEntry={codeEntry} />
          ) : (
            <CodeEditor
              project={project!}
              codeEntry={codeEntry}
              onCodeChange={(id, code) => codeEntry.updateCode(code)}
              selectedElementId={selectedElementLookupId}
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
        onClose: () => project?.toggleEditEntry(codeEntry),
      }))}
    />
  );
};
