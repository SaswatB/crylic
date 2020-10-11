/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetUserProjects
// ====================================================

export interface GetUserProjects_viewer_projects {
  __typename: "Project";
  id: uuid;
  name: string;
}

export interface GetUserProjects_viewer {
  __typename: "User";
  /**
   * An array relationship
   */
  projects: GetUserProjects_viewer_projects[];
}

export interface GetUserProjects {
  /**
   * execute function "viewer" which returns "User"
   */
  viewer: GetUserProjects_viewer[];
}
