import React from "react";
import { faCrosshairs } from "@fortawesome/free-solid-svg-icons";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
} from "@material-ui/core";
import { useSnackbar } from "notistack";

import { IconButton } from "../../../components/IconButton";
import { createModal } from "../../../components/PromiseModal";
import { useSelectInput, useTextInput } from "../../../hooks/useInput";
import { useObservable } from "../../../hooks/useObservable";
import { useService } from "../../../hooks/useService";
import { useProject } from "../../../services/ProjectService";
import { SelectService } from "../../../services/SelectService";
import {
  isSelectedElementTarget_Component,
  isSelectedElementTarget_NotRenderEntry,
  SelectedElementTargetType,
} from "../../../types/selected-element";
import {
  createNewEditContext,
  createNewReadContext,
} from "../../ast/editors/ASTEditor";
import { CodeEntry } from "../../project/CodeEntry";
import { isDefined } from "../../utils";
import { ElementEditorFieldProps } from "../ElementEditor";

type Props = {
  styleEntries: CodeEntry[];
};

const AddStyleGroup = createModal<
  Props,
  {
    name: string;
    codeEntry: CodeEntry | null;
    createNewCodeEntry: boolean;
  } | null
>(({ styleEntries, resolve }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [name, renderNameInput, isNameValid] = useTextInput({
    label: "Style Group Name",
    initialValue: "",
    validate: (v) => v.match(/^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/) !== null,
  });

  const [location, renderLocationInput] = useSelectInput({
    label: "Location",
    initialValue: styleEntries[0]?.id || "new",
    options: styleEntries
      .map((b) => ({
        name: b.friendlyName,
        value: b.id,
      }))
      .concat([{ name: "New Style Sheet", value: "new" }]),
  });

  const onSubmit = () => {
    if (!name) {
      enqueueSnackbar("Please enter a name", { variant: "error" });
      return;
    }
    if (!isNameValid) return;

    resolve({
      name,
      codeEntry:
        location === "new"
          ? null
          : styleEntries.find((b) => b.id === location)!,
      createNewCodeEntry: location === "new",
    });
  };

  return (
    <Dialog open={true} onClose={() => resolve(null)}>
      <DialogTitle>Add Style Sheet Style Group</DialogTitle>
      <DialogContent>
        <div className="mb-4">{renderNameInput()}</div>
        {renderLocationInput()}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => resolve(null)} color="primary">
          Cancel
        </Button>
        <Button onClick={onSubmit} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export function StyleGroupSelectorFE({
  selectedElement,
  openInEditor,
}: ElementEditorFieldProps) {
  const { enqueueSnackbar } = useSnackbar();
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedStyleGroup = useObservable(selectService.selectedStyleGroup$);

  const styleGroupOptions = [
    ...(
      (isSelectedElementTarget_Component(selectedElement) &&
        selectedElement.target.styleGroups) ||
      []
    ).map((group) => ({
      name: `${group.name}`,
      category: group.category,
      value: group,
    })),
    {
      name: "Add Style Sheet Style Group",
      category: "Actions",
      value: async () => {
        if (!isSelectedElementTarget_NotRenderEntry(selectedElement)) return;

        const codeId = project.primaryElementEditor.getCodeIdFromLookupId(
          selectedElement.target.lookupId
        );
        if (!codeId) return;
        const codeEntry = project.getCodeEntryValue(codeId);
        if (!codeEntry) return;

        const codeEntryFolder = codeEntry.filePath.getDirname();

        // get the available imports
        const { availableImports, directProps } =
          project.primaryElementEditor.getSourceMetaDataFromLookupId(
            await createNewReadContext(codeEntry),
            selectedElement.target.lookupId,
            { includeImports: true }
          ) || {};

        // translate imports to code entries
        const codeEntries = project.codeEntries$.getValue();
        const importedStyleEntries = availableImports
          // todo support modules aliases
          ?.filter((i) => i.startsWith("./") || i.startsWith("../"))
          // todo support preference config
          .sort((a, b) => b.length - a.length)
          .map((i) => codeEntryFolder.join(i))
          .map((i) => codeEntries.find((e) => e.filePath.isEqual(i)))
          .filter(isDefined)
          .filter((e) => e.isStyleEntry);

        // prompt user to select a style sheet and group name
        const res = await AddStyleGroup({
          // todo support importing other files
          styleEntries: importedStyleEntries || [],
        });
        if (!res) return;

        // resolve the style entry
        let styleEntry: CodeEntry;
        if (res.createNewCodeEntry) {
          const getPath = (suffix = "") =>
            codeEntryFolder.join(codeEntry.baseName + suffix + ".css");
          let filePath = getPath();
          let index = 1;
          // todo better duplicate handling
          while (codeEntries.find((e) => e.filePath.isEqual(filePath))) {
            filePath = getPath(`-${index++}`);
          }
          styleEntry = new CodeEntry(project, filePath, "");
          project?.addCodeEntries([styleEntry]);
          project.saveFile(styleEntry);
        } else {
          styleEntry = res.codeEntry!;
        }

        const styleEditor = project.getEditorsForCodeEntry(styleEntry)[0];
        if (!styleEditor) {
          // todo put more debugging info here
          enqueueSnackbar("Could not open style editor", { variant: "error" });
          return;
        }

        // register a listener to select the new style group when it appears
        const subscription = selectService.selectedElement$.subscribe(
          (newSelectedElement) => {
            if (
              newSelectedElement?.target.type !== selectedElement.target.type ||
              newSelectedElement?.target.lookupId !==
                selectedElement.target.lookupId
            ) {
              subscription.unsubscribe();
              return;
            } else if (
              newSelectedElement.target.type !==
              SelectedElementTargetType.Component
            ) {
              return;
            }

            // todo use a better matching system than name
            const newStyleGroup = newSelectedElement.target.styleGroups.find(
              (g) => g.name.replace(".", "").trim() === res.name
            );
            if (newStyleGroup) {
              selectService.setSelectedStyleGroup(newStyleGroup);
              subscription.unsubscribe();
              enqueueSnackbar("New style group successfully created", {
                variant: "success",
              });
            }
          }
        );
        setTimeout(() => subscription.unsubscribe(), 1000); // timeout just in case

        // update files
        // todo join these in the save undo entry
        await styleEntry.updateAst(
          styleEditor.addStyleGroup(
            await createNewEditContext(styleEntry, ""),
            res.name
          )
        );
        await selectService.updateSelectedElement((editor, editContext) => {
          let newAst = editor.updateElementAttributes(editContext, {
            // todo use a better merge algo that supports dynamic class names
            className: `${res.name} ${
              "className" in (directProps || {}) ? directProps!.className : ""
            }`.trim(),
          });
          if (res.createNewCodeEntry) {
            newAst = editor.addImport(
              { ...editContext, ast: newAst },
              {
                name: "",
                path: styleEntry.filePath,
                skipIdentifier: true,
              }
            );
          }
          return newAst;
        });
      },
    },
  ].map((o, index) => ({ ...o, index: index + 1 }));
  const styleGroupOptionMap = styleGroupOptions.reduce(
    (p: Record<string, typeof c[]>, c) => {
      p[c.category] = [...(p[c.category] || []), c];
      return p;
    },
    {}
  );

  return (
    <>
      <FormControl fullWidth variant="outlined" className="flex-1">
        <Select
          value={
            styleGroupOptions.find(
              (o) =>
                typeof o.value !== "function" &&
                o.value.lookupId === selectedStyleGroup?.lookupId
            )?.index || ""
          }
          onChange={(e) => {
            const value = styleGroupOptions.find(
              (o) => o.index === e.target.value
            )?.value;
            if (!value) return;

            if (typeof value === "function") value();
            else selectService.setSelectedStyleGroup(value);
          }}
        >
          {Object.entries(styleGroupOptionMap).map(([category, options]) => [
            <ListSubheader>{category}</ListSubheader>,
            ...options.map((o) => (
              <MenuItem key={o.category + o.name} value={o.index}>
                {o.name}
              </MenuItem>
            )),
          ])}
        </Select>
      </FormControl>
      <IconButton
        title="View in Code Editor"
        className="ml-3"
        icon={faCrosshairs}
        onClick={() =>
          selectedStyleGroup &&
          openInEditor(selectedStyleGroup.lookupId, selectedStyleGroup.editor)
        }
      />
    </>
  );
}
