import React, { FunctionComponent } from "react";
import { Link } from "react-router-dom";
import { gql, useQuery } from "@apollo/client";

import { Routes } from "../../App";
import { PageFrame } from "../PageFrame";
import { GetUserProjects } from "./__generated__/GetUserProjects";

export const ProjectSelector: FunctionComponent = () => {
  const { data, loading } = useQuery<GetUserProjects>(gql`
    query GetUserProjects {
      viewer {
        projects {
          id
          name
        }
      }
    }
  `);

  const renderProjectList = () =>
    data?.viewer[0]?.projects.map((project) => (
      <Link
        key={project.id}
        className="p-4 m-3 bg-purple-900 default-transition hover:bg-purple-800"
        to={Routes.EDIT_PROJECTS.getPath(project.id)}
      >
        {project.name}
      </Link>
    ));

  return (
    <PageFrame bodyColor="purple-hue" loading={loading}>
      {data?.viewer[0]?.projects.length === 0
        ? "You have no projects"
        : renderProjectList()}
    </PageFrame>
  );
};
