/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetGitHubProjects
// ====================================================

export interface GetGitHubProjects_viewer_integrations {
  __typename: "Integration";
  type: string;
}

export interface GetGitHubProjects_viewer_github_projects {
  __typename: "GithubProject";
  name: string;
  url: string;
  primaryLanguage: string | null;
}

export interface GetGitHubProjects_viewer_github {
  __typename: "Github";
  name: string;
  projects: GetGitHubProjects_viewer_github_projects[];
}

export interface GetGitHubProjects_viewer {
  __typename: "User";
  id: uuid;
  email: string;
  /**
   * An array relationship
   */
  integrations: GetGitHubProjects_viewer_integrations[];
  /**
   * Remote relationship field
   */
  github: GetGitHubProjects_viewer_github | null;
}

export interface GetGitHubProjects {
  /**
   * execute function "viewer" which returns "User"
   */
  viewer: GetGitHubProjects_viewer[];
}
