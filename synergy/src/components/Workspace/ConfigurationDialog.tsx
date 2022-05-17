import React, { useContext, VoidFunctionComponent } from "react";
import styled from "@emotion/styled";
import { Dialog, DialogContent, DialogTitle } from "@material-ui/core";

import { usePackageInstallerRecoil } from "../../hooks/recoil/usePackageInstallerRecoil";
import { useService } from "../../hooks/useService";
import { ProjectService, useProject } from "../../services/ProjectService";
import { TourContext } from "../Tour/Tour";

export const ConfigurationDialog: VoidFunctionComponent<{
  open: boolean;
  optOutConfigNode: React.ReactNode;
  onClose: () => void;
  onEditWebpackConfig: () => void;
}> = ({ open, optOutConfigNode, onClose, onEditWebpackConfig }) => {
  const projectService = useService(ProjectService);
  const project = useProject();
  const { installPackages } = usePackageInstallerRecoil();
  const { tourDisabled, setTourDisabled, resetTour } = useContext(TourContext);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl">
      <DialogTitle>Project Configuration</DialogTitle>
      <DialogContent>
        <div className="flex flex-col">
          <div className="flex">
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
          <div className="flex">
            <Button
              onClick={() => {
                installPackages(undefined);
                onClose();
              }}
            >
              Install Project Dependencies
            </Button>
            <Button
              onClick={() => {
                onEditWebpackConfig();
                onClose();
              }}
            >
              Edit Webpack Config
            </Button>
          </div>
          <div className="flex">
            <Button onClick={() => setTourDisabled(!tourDisabled)}>
              {tourDisabled ? "Enable Tour" : "Disable Tour"}
            </Button>
            {!tourDisabled && (
              <Button onClick={() => resetTour()}>Restart Tour</Button>
            )}
          </div>
          {optOutConfigNode}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Button = styled.button`
  border-radius: 15px;
  background-color: #0000003b;
  padding: 20px;
  margin: 10px;
`;
