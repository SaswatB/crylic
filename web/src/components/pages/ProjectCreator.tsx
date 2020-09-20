import React, { FunctionComponent } from "react";
import { gql, useQuery } from "@apollo/client";

import { BodyColor } from "../BodyColor";

export const ProjectCreator: FunctionComponent = () => {
  const { data } = useQuery(gql`
    {
      viewer {
        email
        Integrations {
          type
        }
      }
    }
  `);
  console.log("data", data);
  return (
    <div className="flex justify-center items-center h-screen">
      <BodyColor className="green-hue" />
    </div>
  );
};
