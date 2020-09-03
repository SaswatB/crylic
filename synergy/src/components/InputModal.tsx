import React, { useState } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";

import { createModal } from "./PromiseModal";

type Props = {
  title: string;
  message: string;
};
type Result = string | null;

export const InputModal = createModal<Props, Result>(
  ({ title, message, resolve }) => {
    const [input, setInput] = useState("");
    return (
      <Dialog open={true} onClose={() => resolve(null)}>
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
            onKeyDown={(e) => {
              if (e.keyCode === 13) {
                resolve(input);
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resolve(null)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => resolve(input)} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);
