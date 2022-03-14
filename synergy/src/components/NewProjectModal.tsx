import React from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { useSnackbar } from "notistack";

import { useSelectInput, useTextInput } from "../hooks/useInput";
import { createModal } from "./PromiseModal";

export const NewProjectModal = createModal<
  {
    templates: { name: string; value: string }[];
    initialName: string;
    initialLocation: string;
    onBrowse: () => Promise<string | null>;
  },
  { name: string; template: string; location: string } | null
>(({ templates, initialName, initialLocation, onBrowse, resolve }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [name, renderNameInput] = useTextInput({
    label: "Name",
    initialValue: initialName,
  });

  const [template, renderTemplateInput] = useSelectInput({
    label: "Template",
    initialValue: templates[0]!.value,
    options: templates,
  });

  const [location, renderLocationInput, , , setLocation] = useTextInput({
    label: "Location",
    initialValue: initialLocation,
  });

  const onSubmit = () => {
    if (!name) {
      enqueueSnackbar("Please enter a name", { variant: "error" });
      return;
    }
    if (!location) {
      // todo validate location
      enqueueSnackbar("Please enter a location", { variant: "error" });
      return;
    }

    resolve({ name, template, location });
  };

  return (
    <Dialog open={true} maxWidth={false} onClose={() => resolve(null)}>
      <DialogTitle className="flex justify-between">New Project</DialogTitle>
      <DialogContent style={{ width: "60vw" }}>
        <div className="mb-4 flex flex-col">{renderNameInput()}</div>
        <div className="mb-4">{renderTemplateInput()}</div>
        <div className="mb-4 flex">
          {renderLocationInput({ className: "flex-1" })}
          <Button onClick={() => onBrowse().then((b) => b && setLocation(b))}>
            Browse
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => resolve(null)}>Cancel</Button>
        <Button onClick={() => onSubmit()} color="primary">
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
});
