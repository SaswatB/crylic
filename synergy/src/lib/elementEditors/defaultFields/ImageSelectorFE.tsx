import React from "react";
import { startCase } from "lodash";
import { useSnackbar } from "notistack";

import { StylePropNameMap } from "../../../components/SideBar/css-options";
import { useMenuInput, useTextInput } from "../../../hooks/useInput";
import { useObservable } from "../../../hooks/useObservable";
import { useService } from "../../../hooks/useService";
import { useProject } from "../../../services/ProjectService";
import { SelectService } from "../../../services/SelectService";
import {
  getSelectedElementStyleValue,
  isSelectedElementTarget_Component,
} from "../../../types/selected-element";
import { updateStyleGroupHelper } from "../../ast/code-edit-helpers";
import { CodeEntry } from "../../project/CodeEntry";
import { ElementEditorFieldProps } from "../ElementEditor";
import { useInputRowWrapper } from "../InputRowWrapper";

export function ImageSelectorFE({
  selectedElement,
  imageProp,
}: ElementEditorFieldProps & { imageProp: "backgroundImage" }) {
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedStyleGroup = useObservable(selectService.selectedStyleGroup$);
  const codeEntries = useObservable(project.codeEntries$);
  const { enqueueSnackbar } = useSnackbar();

  const onChange = (assetEntry: CodeEntry | null) => {
    if (!selectedStyleGroup) return;
    void updateStyleGroupHelper(
      project,
      selectedStyleGroup,
      (editor, editContext) =>
        editor.updateElementImage(editContext, imageProp, assetEntry)
    ).catch((err) => {
      enqueueSnackbar(err.message, { variant: "error" });
      console.error(err);
    });
  };
  const label = StylePropNameMap[imageProp] || startCase(`${imageProp || ""}`);
  const initialValue = isSelectedElementTarget_Component(selectedElement)
    ? getSelectedElementStyleValue(selectedElement, imageProp)
    : "";

  const options = codeEntries
    .filter((e) => e.isImageEntry)
    .map((entry) => ({
      name: entry.filePath.getBasename(),
      value: entry.id,
    }));
  const [, renderMenu, openMenu, closeMenu] = useMenuInput({
    options,
    disableSelection: true,
    onChange: (newCodeId: string) => {
      onChange(project.getCodeEntryValue(newCodeId)!);
      closeMenu();
      // prevent the textbox from being focused so that it gets updated
      // todo is there a better way than this timeout?
      setTimeout(
        () => (document.activeElement as HTMLInputElement)?.blur?.(),
        100
      );
    },
  });

  const [, renderValueInput] = useInputRowWrapper(useTextInput, {
    label,
    initialValue: `${initialValue}`,
    bindInitialValue: true,
    onClear: () => onChange(null),
  });

  return (
    <>
      {renderValueInput({ onClick: (e) => options.length > 0 && openMenu(e) })}
      {renderMenu()}
    </>
  );
}
