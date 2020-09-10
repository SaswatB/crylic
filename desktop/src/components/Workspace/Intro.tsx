import React, { FunctionComponent } from "react";

import { Tour } from "synergy/src/components/Tour/Tour";

interface Props {
  onNewProject: () => void;
  onOpenProject: () => void;
}

export const Intro: FunctionComponent<Props> = ({
  onNewProject,
  onOpenProject,
}) => (
  <div className="btngrp-v w-full">
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
      Crylic is project based, so to get started you will need to either create
      a new project or open an existing one. <br />
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
);
