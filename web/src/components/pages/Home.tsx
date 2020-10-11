import React, { FunctionComponent } from "react";
import { Link } from "react-router-dom";

import { Tour } from "synergy/src/components/Tour/Tour";

import { Routes } from "../../App";
import { PageFrame } from "../PageFrame";

export const Home: FunctionComponent = () => {
  return (
    <PageFrame bodyColor="dark-blue-hue">
      <Tour
        name="start"
        autoOpen
        disableSpotlight
        beaconStyle={{ position: "fixed", left: "50%", top: 20 }}
      >
        Welcome! <br />
        To help get you started, this tour will guide you through the basics of
        using Crylic. <br />
        <br />
        Look around for beacons to get further instructions.
        <br />
        <br />
        Please note, this application may send reports to the developer if any
        errors occur.
      </Tour>
      <div className="btngrp-v w-64">
        <Link
          className="btn w-full text-center"
          data-tour="new-project"
          to={Routes.NEW_PROJECT.getPath()}
        >
          New Project
        </Link>
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
        <Link
          className="btn w-full text-center"
          to={Routes.LIST_PROJECTS.getPath()}
        >
          Open Project
        </Link>
      </div>
    </PageFrame>
  );
};
