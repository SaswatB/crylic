import React, { useState } from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FormControl, InputLabel, MenuItem, Select } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import TextField from "@material-ui/core/TextField";

import { createModal } from "./PromiseModal";

const PREDEFINED_RESOLUTIONS: {
  name: string;
  width: number;
  height: number;
}[] = [
  // lm_644b8c2629 default frame resolution is iPhone SE
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone XR", width: 414, height: 896 },
  { name: "iPhone 12 Pro", width: 390, height: 844 },
  { name: "Pixel 5", width: 393, height: 851 },
  { name: "Samsung Galaxy S8+", width: 360, height: 740 },
  { name: "Samsung Galaxy S20 Ultra", width: 412, height: 915 },
  { name: "iPad Air", width: 820, height: 1180 },
  { name: "iPad Mini", width: 768, height: 1024 },
  { name: "Surface Pro 7", width: 912, height: 1368 },
  { name: "Surfact Duo", width: 540, height: 720 },
  { name: "Galaxy Fold", width: 280, height: 653 },
  { name: "Samsung Galaxy A51/71", width: 412, height: 914 },
  { name: "720p", width: 1280, height: 720 },
  { name: "1080p", width: 1920, height: 1080 },
];

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
            <FormControl fullWidth>
              <InputLabel id="resolution-select-label">Resolution</InputLabel>
              <Select
                labelId="resolution-select-label"
                label="Resolution"
                value={
                  PREDEFINED_RESOLUTIONS.find(
                    (r) => `${r.width}` === width && `${r.height}` === height
                  )?.name || null
                }
                onChange={(e) => {
                  const r = PREDEFINED_RESOLUTIONS.find(
                    (r) => r.name === e.target.value
                  );
                  if (r) {
                    setWidth(`${r.width}`);
                    setHeight(`${r.height}`);
                  }
                }}
              >
                {PREDEFINED_RESOLUTIONS.map((r) => (
                  <MenuItem value={r.name}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
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
