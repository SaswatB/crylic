import React from "react";
import { startCase } from "lodash";
import path from "path";

import { StylePropNameMap } from "../../../components/SideBar/css-options";
import { useMenuInput, useTextInput } from "../../../hooks/useInput";
import { useObservable } from "../../../hooks/useObservable";
import { useService } from "../../../hooks/useService";
import { useProject } from "../../../services/ProjectService";
import { SelectService } from "../../../services/SelectService";
import { getSelectedElementStyleValue } from "../../../types/selected-element";
import { updateStyleGroupHelper } from "../../ast/code-edit-helpers";
import { CodeEntry } from "../../project/CodeEntry";
import { ElementEditorFieldProps } from "../ElementEditor";

export function ImageSelectorFE({
  selectedElement,
  imageProp,
}: ElementEditorFieldProps & { imageProp: "backgroundImage" }) {
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedStyleGroup = useObservable(selectService.selectedStyleGroup$);

  const onChange = (assetEntry: CodeEntry) => {
    if (!selectedStyleGroup) return;
    void updateStyleGroupHelper(
      project,
      selectedStyleGroup,
      (editor, editContext) =>
        editor.updateElementImage(editContext, imageProp, assetEntry)
    );
  };
  const label = StylePropNameMap[imageProp] || startCase(`${imageProp || ""}`);
  const initialValue = getSelectedElementStyleValue(selectedElement, imageProp);

  const [, renderMenu, openMenu, closeMenu] = useMenuInput({
    options: (project?.codeEntries$.getValue() || [])
      .filter((e) => e.isImageEntry)
      .map((entry) => ({
        name: path.basename(entry.filePath),
        value: entry.id,
      })),
    disableSelection: true,
    onChange: (newCodeId: string) => {
      closeMenu();
      onChange(project.getCodeEntryValue(newCodeId)!);
    },
  });

  const [, renderValueInput] = useTextInput({
    label,
    initialValue: `${initialValue}`,
    bindInitialValue: true,
  });

  return (
    <>
      {renderValueInput({ onClick: openMenu })}
      {renderMenu()}
    </>
  );
}
