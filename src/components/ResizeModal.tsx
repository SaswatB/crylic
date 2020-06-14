import React, { useState } from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
  message?: string;
  defaultWidth: number;
  defaultHeight: number;
};
type Result = { width: number; height: number } | null;

export const ResizeModal = createModal<Props, Result>(
  ({ title, message, defaultWidth, defaultHeight, resolve }) => {
    const [width, setWidth] = useState(`${defaultWidth}`);
    const [height, setHeight] = useState(`${defaultHeight}`);

    const onSubmit = () =>
      resolve({
        width: Math.max(parseInt(width), 100),
        height: Math.max(parseInt(height), 10),
      });

    return (
      <Dialog open={true} onClose={() => resolve(null)}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {message && <DialogContentText>{message}</DialogContentText>}
          <div>
            <TextField
              className="w-32"
              autoFocus
              margin="dense"
              label="Width"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              // submit on enter
              onKeyDown={(e) => {
                if (e.keyCode === 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              }}
            />
            <FontAwesomeIcon className="mx-4 mt-6" icon={faTimes} />
            <TextField
              className="w-32"
              autoFocus
              margin="dense"
              label="Height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              // submit on enter
              onKeyDown={(e) => {
                if (e.keyCode === 13) {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubmit();
                }
              }}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resolve(null)} color="primary">
            Cancel
          </Button>
          <Button onClick={() => onSubmit()} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);
