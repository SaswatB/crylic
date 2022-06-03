import { FunctionComponent, useEffect } from "react";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@material-ui/core";
import { useSnackbar } from "notistack";
import { useBus } from "ts-bus/react";

import { usePackageInstallerRecoil } from "../../hooks/recoil/usePackageInstallerRecoil";
import { useBusSubscription } from "../../hooks/useBusSubscription";
import { useService } from "../../hooks/useService";
import {
  fileSyncConflict,
  fileSyncSuccess,
  projectSave,
} from "../../lib/events";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";

export const StateManager: FunctionComponent = () => {
  const project = useProject({ allowUndefined: true });
  const bus = useBus();
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

  // handle file save requests
  useBusSubscription(projectSave, () => {
    try {
      project?.saveFiles();
      enqueueSnackbar("Files Saved!", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        `There was an error while saving: ${(error as Error).message}`,
        { variant: "error" }
      );
    }
  });

  /* Notifications */

  // handle file sync notifications
  useBusSubscription(fileSyncSuccess, ({ paths }) => {
    enqueueSnackbar(
      <>
        {paths.length} file{paths.length > 1 ? "s" : ""} synced from changes on
        disk:
        <br />
        {paths.map((p, index) => (
          <React.Fragment key={index}>
            • {p} <br />
          </React.Fragment>
        ))}
      </>,
      { variant: "success" }
    );
  });
  useBusSubscription(fileSyncConflict, ({ paths }) => {
    enqueueSnackbar(
      <>
        {paths.length} file{paths.length > 1 ? "s" : ""} failed synced from
        changes on disk due to unsaved changes in Crylic:
        <br />
        {paths.map((p, index) => (
          <React.Fragment key={index}>
            • {p} <br />
          </React.Fragment>
        ))}
      </>,
      { variant: "error" }
    );
  });

  /* Hotkeys */

  // handle save/undo/redo hotkeys
  useHotkeys(
    "ctrl+s",
    () => bus.publish(projectSave()),
    { enableOnTags: ["INPUT", "SELECT", "TEXTAREA"] },
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
