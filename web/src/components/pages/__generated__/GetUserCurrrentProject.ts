/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetUserCurrrentProject
// ====================================================

export interface GetUserCurrrentProject_viewer_projects {
  __typename: "Project";
  id: uuid;
  name: string;
}

export interface GetUserCurrrentProject_viewer {
  __typename: "User";
  /**
   * An array relationship
   */
  projects: GetUserCurrrentProject_viewer_projects[];
}

export interface GetUserCurrrentProject {
  /**
   * execute function "viewer" which returns "User"
   */
  viewer: GetUserCurrrentProject_viewer[];
}

export interface GetUserCurrrentProjectVariables {
  projectId: uuid;
}
