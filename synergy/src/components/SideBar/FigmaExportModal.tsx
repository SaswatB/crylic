import React from "react";
import MonacoEditor from "react-monaco-editor";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { useSnackbar } from "notistack";

import { Spacer } from "../base/Flex";
import { createModal } from "../PromiseModal";

export const FigmaExportModal = createModal<{ json: string }, null>(
  ({ json, resolve }) => {
    const { enqueueSnackbar } = useSnackbar();
    return (
      <Dialog open={true} onClose={() => resolve(null)}>
        <DialogTitle className="flex justify-between">
          Figma Export Data
        </DialogTitle>
        <DialogContent>
          Use the Crylic Figma Plugin to import this component into your Figma
          project!
          <MonacoEditor
            language="typescript"
            theme="darkVsPlus"
            value={json}
            options={{ automaticLayout: true, wordWrap: "on", readOnly: true }}
            width="500px"
            height="300px"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(json);
              enqueueSnackbar("Copied to clipboard", { variant: "success" });
            }}
            color="primary"
          >
            Copy
          </Button>
          <Spacer />
          <Button onClick={() => resolve(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
);
