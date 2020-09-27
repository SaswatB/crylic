import React, { FunctionComponent } from "react";
import { gql, useQuery } from "@apollo/client";
import { Backdrop, CircularProgress } from "@material-ui/core";
import { useSnackbar } from "notistack";

import { openSignInWindow } from "../../lib/oauth-popup";
import { BodyColor } from "../BodyColor";

export const ProjectCreator: FunctionComponent = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { data, loading, refetch } = useQuery(gql`
    {
      viewer {
        id
        email
        Integrations {
          type
        }
        github {
          name
          projects {
            name
            url
            primaryLanguage
          }
        }
      }
    }
  `);
  const hasGithub = !!data?.viewer?.[0]?.Integrations?.find(
    (i: any) => i.type === "github"
  );
  console.log("data", data);

  const renderAddGithub = () => (
    <button
      className="btn w-64 text-center"
      onClick={() =>
        openSignInWindow(
          `https://github.com/login/oauth/authorize?client_id=93b6802c9ec33bc8fdee&scope=repo&state=${data.viewer[0].id}`,
          "GitHub Login",
          () => {
            enqueueSnackbar("GitHub account connected!");
            refetch();
          }
        )
      }
    >
      Add GitHub Account
    </button>
  );

  const renderGithubProjects = () => {
    const projects = data?.viewer?.[0]?.github?.projects || [];
    if (projects.length === 0) return <div>No projects found on GitHub</div>;
    return projects.map((project: any) => (
      <div className="p-4">{project.name}</div>
    ));
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <Backdrop open={loading}>
        <CircularProgress disableShrink />
      </Backdrop>
      <BodyColor className="green-hue" />
      {!loading && (hasGithub ? renderGithubProjects() : renderAddGithub())}
    </div>
  );
};
