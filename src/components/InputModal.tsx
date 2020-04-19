import React, { useState } from "react";
import { createModal } from "react-modal-promise";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";

type ExtractComponentProps<Type> = Type extends React.ComponentType<infer X>
  ? X
  : never;
type Props = ExtractComponentProps<Parameters<typeof createModal>[0]> & {
  title: string;
  message: string;
};
type Result = string | null;

export const InputModal = createModal<Props, Result>(
  ({ title, message, open, onResolve }) => {
    const [input, setInput] = useState("");
    return (
      <Dialog open={open || false} onClose={() => onResolve?.(null)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{message}</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            value={input}
            onChange={(e) => setInput(e.target.value)}
            // submit on enter
            onKeyDown={(e) => e.keyCode === 13 && onResolve?.(input)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => onResolve?.(null)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => onResolve?.(input)} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);
