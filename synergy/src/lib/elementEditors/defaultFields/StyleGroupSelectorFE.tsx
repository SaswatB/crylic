import React, { useCallback } from "react";
import { faCrosshairs } from "@fortawesome/free-solid-svg-icons";
import { useBus } from "ts-bus/react";

import { IconButton } from "../../../components/IconButton";
import { useAutocomplete } from "../../../hooks/useInput";
import { useObservable } from "../../../hooks/useObservable";
import { useService } from "../../../hooks/useService";
import { useProject } from "../../../services/ProjectService";
import { SelectService } from "../../../services/SelectService";
import { StyleGroup } from "../../ast/editors/ASTEditor";
import { editorOpenLocation } from "../../events";
import { ElementEditorFieldProps } from "../ElementEditor";

export function StyleGroupSelectorFE({
  selectedElement,
}: ElementEditorFieldProps) {
  const bus = useBus();
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedStyleGroup = useObservable(selectService.selectedStyleGroup$);

  const openInEditor = useCallback(
    async ({ editor, lookupId }: StyleGroup) => {
      const codeId = editor.getCodeIdFromLookupId(lookupId);
      if (!codeId) return;
      const codeEntry = project.getCodeEntryValue(codeId);
      if (!codeEntry) return;
      const line = editor.getCodeLineFromLookupId(
        { codeEntry, ast: await codeEntry.getLatestAst() },
        lookupId
      );
      console.log("openInEditor", codeEntry, line);
      let timeout = 0;
      if (
        !project?.editEntries$.getValue().find((e) => e.codeId === codeEntry.id)
      ) {
        project?.addEditEntries(codeEntry);
        // todo don't cheat with a timeout here
        timeout = 500;
      }
      setTimeout(
        () => bus.publish(editorOpenLocation({ codeEntry, line })),
        timeout
      );
    },
    [bus, project]
  );

  const styleGroupOptions = (selectedElement.styleGroups || []).map(
    (group) => ({
      name: `${group.name}`,
      category: group.category,
      value: group,
    })
  );

  const [, renderStyleGroupSelector] = useAutocomplete({
    // @ts-expect-error todo fix type error caused by generics
    options: styleGroupOptions,
    // @ts-expect-error todo fix type error caused by generics
    onChange: selectService.setSelectedStyleGroup.bind(selectService),
    // @ts-expect-error todo fix type error caused by generics
    initialValue: selectedStyleGroup,
  });

  return (
    <>
      {renderStyleGroupSelector({ className: "flex-1" })}
      <IconButton
        title="View in Code Editor"
        className="ml-3"
        icon={faCrosshairs}
        onClick={() => selectedStyleGroup && openInEditor(selectedStyleGroup)}
      />
    </>
  );
}
