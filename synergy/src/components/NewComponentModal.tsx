import React, { CSSProperties } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { camelCase, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import { useSelectInput, useTextInput } from "../hooks/useInput";
import { prettyPrintTS } from "../lib/ast/ast-helpers";
import { CodeEntry } from "../lib/project/CodeEntry";
import { useProject } from "../services/ProjectService";
import { createModal } from "./PromiseModal";

enum Preset {
  Basic = "Basic",
  BasicWSS = "Basic with Style Sheet",
}

enum BaseComponent {
  Button = "button",
  Div = "div",
  A = "a",
  Span = "span",
}

const BaseComponentNames: Record<BaseComponent, string> = {
  [BaseComponent.Button]: "Button",
  [BaseComponent.Div]: "Container",
  [BaseComponent.A]: "Link",
  [BaseComponent.Span]: "Text",
};

const getBoilerPlateComponent = (
  name: string,
  baseComponent: string,
  styles: CSSProperties,
  includeStyleSheet: boolean
) =>
  prettyPrintTS(`
import React from "react";
${includeStyleSheet ? `import "./${name}.css";` : ""}

export function ${name}() {
  return (
    <${baseComponent}
      ${includeStyleSheet ? `className="${name}"` : ""}
      ${
        Object.entries(styles).length > 0
          ? `style={${JSON.stringify(styles)}}`
          : ""
      }
    />
  );
}
`);

const getBoilerPlateStyleSheet = (name: string) =>
  `.${name} {
}`.trim();

export const NewComponentModal = createModal<{}, null>(({ resolve }) => {
  const project = useProject();
  const { enqueueSnackbar } = useSnackbar();

  const [name, renderNameInput] = useTextInput({
    label: "Component Name",
    initialValue: "",
  });
  const normalizedComponentName = upperFirst(
    camelCase(name.replace(/[^a-zA-Z0-9 ]/g, ""))
  );

  const [preset, renderPresetInput] = useSelectInput({
    label: "Preset",
    initialValue: Preset.BasicWSS,
    options: Object.values(Preset).map((b) => ({
      name: b,
      value: b,
    })),
  });

  const [base, renderBaseInput] = useSelectInput({
    label: "Base",
    initialValue: BaseComponent.Div,
    options: Object.values(BaseComponent).map((b) => ({
      name: BaseComponentNames[b],
      value: b,
    })),
  });

  const [location, renderLocationInput] = useTextInput({
    label: "Component Location",
    initialValue: project.getDefaultNewComponentFolder(),
  });

  const onSubmit = () => {
    if (!normalizedComponentName) {
      enqueueSnackbar("Please enter a name", { variant: "error" });
      return;
    }

    // todo add validation/duplicate checking to name
    const filePath = project.getNormalizedSourcePath(
      `${location}/${normalizedComponentName}.tsx`
    );
    const code = getBoilerPlateComponent(
      normalizedComponentName,
      base,
      {},
      preset === Preset.BasicWSS
    );
    const codeEntry = new CodeEntry(project, filePath, code);
    project.addCodeEntries([codeEntry], { render: true });
    project.saveFile(codeEntry);

    if (preset === Preset.BasicWSS) {
      const filePath2 = project.getNormalizedSourcePath(
        `${location}/${normalizedComponentName}.css`
      );
      const code2 = getBoilerPlateStyleSheet(normalizedComponentName);
      const codeEntry2 = new CodeEntry(project, filePath2, code2);
      project.addCodeEntries([codeEntry2]);
      project.saveFile(codeEntry2);
    }

    enqueueSnackbar("Started a new component!");

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
        <div className="mb-4">{renderBaseInput()}</div>
        {renderLocationInput()}
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
