import React, { useMemo } from "react";
import MonacoEditor from "react-monaco-editor";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { camelCase, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import { usePackageInstallerRecoil } from "../hooks/recoil/usePackageInstallerRecoil";
import { usePersistentSelectInput, useTextInput } from "../hooks/useInput";
import { useObservable } from "../hooks/useObservable";
import { track, useTracking } from "../hooks/useTracking";
import { getBoilerPlateComponent } from "../lib/component-boilerplate";
import { CodeEntry } from "../lib/project/CodeEntry";
import { useProject } from "../services/ProjectService";
import { Collapsible } from "./Collapsible";
import { createModal } from "./PromiseModal";

enum Preset {
  Basic = "Basic",
  BasicWSS = "Basic with Style Sheet",
  BasicWSC = "Basic with Styled Component",
}

const getBoilerPlateStyleSheet = (name: string) =>
  `.${name} {
}`.trim();

export const NewComponentModal = createModal<{}, null>(({ resolve }) => {
  const project = useProject();
  const projectConfig = useObservable(project.config$);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { installPackages } = usePackageInstallerRecoil();
  useTracking("create.component.dialog-open", { onMount: true });

  const [name, renderNameInput] = useTextInput({
    label: "Component Name",
    initialValue: "",
  });
  const normalizedComponentName = upperFirst(
    camelCase(name.replace(/[^a-zA-Z0-9 ]/g, ""))
  );

  const [preset, renderPresetInput] = usePersistentSelectInput({
    label: "Preset",
    initialValue: Preset.BasicWSS,
    localStorageKey: "new-component-dialog-preset",
    options: Object.values(Preset).map((b) => ({
      name: b,
      value: b,
    })),
  });

  const [location, renderLocationInput] = useTextInput({
    label: "Component Location",
    initialValue: projectConfig.getDefaultNewComponentFolder(),
  });

  const code = useMemo(
    () =>
      getBoilerPlateComponent(
        normalizedComponentName || "Component",
        preset === Preset.BasicWSC ? "Container" : "div",
        {},
        preset === Preset.BasicWSS,
        preset === Preset.BasicWSC
          ? projectConfig.getStyledComponentsImport()
          : undefined
      ),
    [normalizedComponentName, preset, projectConfig]
  );

  const onSubmit = async () => {
    if (!normalizedComponentName) {
      enqueueSnackbar("Please enter a name", { variant: "error" });
      return;
    }
    if (
      preset === Preset.BasicWSC &&
      !projectConfig.isPackageInstalled(
        projectConfig.getStyledComponentsImport()
      )
    ) {
      enqueueSnackbar(
        "Unable to create component, styled-components is not installed.",
        {
          variant: "error",
          action: (key) => (
            <Button
              onClick={() => {
                closeSnackbar(key);
                installPackages(projectConfig.getStyledComponentsImport());
              }}
            >
              Install
            </Button>
          ),
        }
      );
      return;
    }

    // todo add validation/duplicate checking to name
    const filePath = project.path.join(
      `${location}/${normalizedComponentName}.tsx`
    );
    const codeEntry = new CodeEntry(project, filePath, code);
    project.addCodeEntries([codeEntry]);
    await project.addRenderEntries(codeEntry);
    project.saveFile(codeEntry);

    if (preset === Preset.BasicWSS) {
      const filePath2 = project.path.join(
        `${location}/${normalizedComponentName}.css`
      );
      const code2 = getBoilerPlateStyleSheet(normalizedComponentName);
      const codeEntry2 = new CodeEntry(project, filePath2, code2);
      project.addCodeEntries([codeEntry2]);
      project.saveFile(codeEntry2);
    }

    enqueueSnackbar("Started a new component!");
    track("create.component", { preset });

    resolve(null);
  };

  return (
    <Dialog open={true} onClose={() => resolve(null)}>
      <DialogTitle className="flex justify-between">New Component</DialogTitle>
      <DialogContent>
        <div className="mb-4 flex flex-col">
          {renderNameInput({ helperText: normalizedComponentName })}
        </div>
        <div className="mb-4">{renderPresetInput()}</div>
        {renderLocationInput({ fullWidth: true })}
        <Collapsible title="Details" defaultCollapsed>
          <MonacoEditor
            language="typescript"
            theme="darkVsPlus"
            value={code}
            options={{ automaticLayout: true, wordWrap: "on", readOnly: true }}
            width="500px"
            height="300px"
          />
        </Collapsible>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => resolve(null)}>Cancel</Button>
        <Button onClick={() => onSubmit()} color="primary">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
});
