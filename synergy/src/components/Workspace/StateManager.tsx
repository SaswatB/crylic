import { FunctionComponent, useEffect } from "react";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@material-ui/core";
import { useSnackbar } from "notistack";

import { usePackageInstallerRecoil } from "../../hooks/recoil/usePackageInstallerRecoil";
import { useService } from "../../hooks/useService";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";

export const StateManager: FunctionComponent = () => {
  const project = useProject({ allowUndefined: true });
  const selectService = useService(SelectService);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { installPackages } = usePackageInstallerRecoil();

  // check if deps should be installed
  useEffect(() => {
    if (!project || project.config.getPackageManager().hasDepsInstalled())
      return;

    const hasExtraDeps = project.config
      .getAllPackages()
      .find(
        (p) =>
          !p.dev &&
          !p.name.startsWith("@types/") &&
          !p.name.startsWith("@babel/") &&
          !p.name.includes("test") &&
          ![
            "react",
            "react-dom",
            "react-scripts",
            "prettier",
            "typescript",
            "webpack",
          ].includes(p.name)
      );
    if (hasExtraDeps) {
      enqueueSnackbar(
        "This project has dependencies that are not currently installed.",
        {
          variant: "warning",
          action: (key) => (
            <Button
              onClick={() => {
                closeSnackbar(key);
                installPackages(undefined);
              }}
            >
              Install
            </Button>
          ),
        }
      );
    }
  }, [closeSnackbar, enqueueSnackbar, installPackages, project]);

  /* Hotkeys */

  // handle save/undo/redo hotkeys
  useHotkeys(
    "ctrl+s",
    () => {
      try {
        project?.saveFiles();
      } catch (error) {
        enqueueSnackbar(
          `There was an error while saving: ${(error as Error).message}`,
          { variant: "error" }
        );
      }
    },
    [project]
  );
  useHotkeys("ctrl+z", () => project?.undoCodeChange(), [project]);
  useHotkeys("ctrl+shift+z", () => project?.redoCodeChange(), [project]);

  // clear select mode on escape hotkey
  useHotkeys("escape", () => {
    selectService.clearSelectedElement();
    selectService.setSelectMode(undefined);
  });

  useHotkeys(
    "delete",
    () =>
      void selectService
        .deleteSelectedElement()
        .catch((e) =>
          enqueueSnackbar((e as Error).message, { variant: "error" })
        )
  );

  return null;
};
