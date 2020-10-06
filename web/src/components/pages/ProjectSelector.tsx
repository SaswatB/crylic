import React, { FunctionComponent } from "react";

import { BodyColor } from "../BodyColor";

export const ProjectSelector: FunctionComponent = () => {
  return (
    <div className="flex justify-center items-center h-screen">
      <BodyColor className="purple-hue" />
      You have no projects
    </div>
  );
};
