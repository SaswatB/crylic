import React, { useContext, VoidFunctionComponent } from "react";
import { Button, Dialog, DialogContent, DialogTitle } from "@material-ui/core";

import { usePackageInstallerRecoil } from "../../hooks/recoil/usePackageInstallerRecoil";
import { useService } from "../../hooks/useService";
import { ProjectService, useProject } from "../../services/ProjectService";
import { TourContext } from "../Tour/Tour";

export const ConfigurationDialog: VoidFunctionComponent<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const projectService = useService(ProjectService);
  const project = useProject();
  const { installPackages } = usePackageInstallerRecoil();
  const { tourDisabled, setTourDisabled, resetTour } = useContext(TourContext);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl">
      <DialogTitle>Project Configuration</DialogTitle>
      <DialogContent>
        <div className="flex flex-col">
          <div>
            <Button
              onClick={() => {
                project.saveFiles();
                onClose();
              }}
              color="primary"
            >
              Save
            </Button>
            <Button
              onClick={() => {
                projectService.setProject(undefined);
                onClose();
              }}
            >
              Close Project
            </Button>
          </div>
          <Button
            onClick={() => {
              installPackages(undefined);
              onClose();
            }}
          >
            Install Project Dependencies
          </Button>
          <div className="flex">
            <Button onClick={() => setTourDisabled(!tourDisabled)}>
              {tourDisabled ? "Enable Tour" : "Disable Tour"}
            </Button>
            {!tourDisabled && (
              <Button onClick={() => resetTour()}>Restart Tour</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
