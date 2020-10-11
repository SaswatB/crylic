import React, { FunctionComponent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { Backdrop, CircularProgress } from "@material-ui/core";
import { useSnackbar } from "notistack";

import { IconButton } from "synergy/src/components/IconButton";

import { openSignInWindow } from "../../lib/oauth-popup";
import { BodyColor } from "../BodyColor";
import { AddProject } from "./__generated__/AddProject";
import { GetGitHubProjects } from "./__generated__/GetGitHubProjects";

export const ProjectCreator: FunctionComponent = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { data, loading, refetch } = useQuery<GetGitHubProjects>(gql`
    query GetGitHubProjects {
      viewer {
        id
        email
        integrations {
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
  const [addProject, { error }] = useMutation<AddProject>(gql`
    mutation AddProject($name: String!, $githubUrl: String!) {
      addProject(name: $name, githubUrl: $githubUrl)
    }
  `);

  const hasGithub = !!data?.viewer?.[0]?.integrations?.find(
    (i: any) => i.type === "github"
  );
  console.log("data", data, error);

  const renderAddGithub = () => (
    <button
      className="btn w-64 text-center"
      onClick={() =>
        openSignInWindow(
          `https://github.com/login/oauth/authorize?client_id=93b6802c9ec33bc8fdee&scope=repo&state=${data?.viewer[0].id}`,
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
    return (
      <div className="flex flex-col m-4">
        <div className="mb-4 text-center text-lg">Import a GitHub Project</div>
        <div className="flex flex-wrap gap-4">
          {projects.map((project: any) => (
            <div className="p-4 rounded overflow-hidden shadow-lg bg-green-900">
              {project.name}
              <IconButton
                className="ml-4"
                icon={faPlus}
                title="Import"
                onClick={() =>
                  addProject({
                    variables: { name: project.name, githubUrl: project.url },
                  }).catch((err) =>
                    enqueueSnackbar(`Failed to create project ${err?.message}`)
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>
    );
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
