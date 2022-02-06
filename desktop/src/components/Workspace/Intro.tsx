import React, { FunctionComponent } from "react";
import path from "path";

import { Tour } from "synergy/src/components/Tour/Tour";
import { RecentProjectEntry } from "synergy/src/services/ProjectService";

import { normalizePath } from "../../utils/normalizePath";

interface Props {
  onNewProject: () => void;
  onOpenProject: () => void;
  recentProjects: RecentProjectEntry[];
  onSelectRecentProject: (filePath: string) => void;
}

export const Intro: FunctionComponent<Props> = ({
  onNewProject,
  onOpenProject,
  recentProjects,
  onSelectRecentProject,
}) => (
  <div className="flex flex-col items-center w-full">
    <div className="btngrp-v w-64">
      <button
        className="btn w-full"
        data-tour="new-project"
        onClick={onNewProject}
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
      <button className="btn w-full" onClick={onOpenProject}>
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
              onClick={() => onSelectRecentProject(filePath)}
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
