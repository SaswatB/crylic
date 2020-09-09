import React, { FunctionComponent, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@material-ui/core";

import { Terminal } from "synergy/src/components/Terminal";

import { usePackageInstallerRecoil } from "../../hooks/recoil/usePackageInstallerRecoil";

export const InstallDialog: FunctionComponent = () => {
  const {
    installingPackages,
    installPackagesOutput,
  } = usePackageInstallerRecoil();

  const [showInstallDialog, setShowInstallDialog] = useState(false);
  useEffect(() => {
    if (installingPackages) setShowInstallDialog(true);
  }, [installingPackages]);
  return (
    <Dialog
      open={showInstallDialog}
      onClose={
        installingPackages ? undefined : () => setShowInstallDialog(false)
      }
      maxWidth="xl"
    >
      <DialogTitle>
        {installingPackages ? "Installing..." : "Installation Complete"}
      </DialogTitle>
      <DialogContent>
        <Terminal writer={installPackagesOutput} />
      </DialogContent>
      <DialogActions>
        {!installingPackages && (
          // todo cancel button?
          <Button onClick={() => setShowInstallDialog(false)} color="primary">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
