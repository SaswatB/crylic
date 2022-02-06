import React, { useState } from "react";
import { Backdrop, CircularProgress } from "@material-ui/core";
import path from "path";

import { Tour } from "synergy/src/components/Tour/Tour";
import { useService } from "synergy/src/hooks/useService";
import { ProjectService } from "synergy/src/services/ProjectService";

import { openFilePicker, saveFilePicker } from "../../hooks/useFilePicker";
import { FileProject } from "../../lib/project/FileProject";
import { normalizePath } from "../../utils/normalizePath";

const fs = __non_webpack_require__("fs") as typeof import("fs");

export function Intro() {
  const projectService = useService(ProjectService);
  const [loading, setLoading] = useState(0);
  const recentProjects = projectService.getRecentProjects();

  const openProject = (filePath: string) => {
    if (!fs.existsSync(filePath)) {
      alert("Project does not exist");
      return;
    }
    setLoading((l) => l + 1);
    // set timeout allows react to render the loading screen before
    // the main thread get's pegged from opening the project
    setTimeout(
      () =>
        FileProject.createProjectFromDirectory(filePath)
          .then((p) => projectService.setProject(p))
          .finally(() => setLoading((l) => l - 1)),
      150
    );
  };

  return (
    <div className="flex flex-col flex-1 absolute items-center justify-center z-10">
      <Backdrop open={loading > 0}>
        <CircularProgress disableShrink />
      </Backdrop>
      <div className="btngrp-v w-64">
        <button
          className="btn w-full"
          data-tour="new-project"
          onClick={() =>
            saveFilePicker({
              filters: [{ name: "Project", extensions: [""] }],
            }).then((f) => {
              if (f)
                FileProject.createNewProjectInDirectory(f).then((p) =>
                  projectService.setProject(p)
                );
            })
          }
        >
          New Project
        </button>
        <Tour
          name="new-project"
          beaconStyle={{
            marginTop: -8,
            marginLeft: 10,
          }}
        >
          Crylic is project based, so to get started you will need to either
          create a new project or open an existing one. <br />
          <br />
          Try creating a new project to start!
          <br />
          Existing React projects can also be opened, ones created with
          create-react-app work the best.
        </Tour>
        <button
          className="btn w-full"
          onClick={() =>
            openFilePicker({ properties: ["openDirectory"] }).then(
              (filePath) => {
                if (!filePath) return;
                openProject(filePath);
              }
            )
          }
        >
          Open Project
        </button>
      </div>
      {recentProjects.length > 0 && (
        <div className="intro-recent-projects flex flex-col mt-10 px-4 py-2 bg-white bg-opacity-10 rounded">
          Recent Projects
          <div className="btngrp-v mt-2">
            {recentProjects.slice(0, 5).map(({ filePath }) => (
              <button
                key={filePath}
                className="btn text-left truncate"
                onClick={() => openProject(filePath)}
                title={filePath}
              >
                {path.basename(normalizePath(filePath, path.sep))} - {filePath}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
