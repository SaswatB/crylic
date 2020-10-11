import React from "react";
import { Route, Switch } from "react-router-dom";

import { Header } from "./components/Header";
import { Home } from "./components/pages/Home";
import { Login } from "./components/pages/Login";
import { ProjectCreator } from "./components/pages/ProjectCreator";
import { ProjectEditor } from "./components/pages/ProjectEditor";
import { ProjectSelector } from "./components/pages/ProjectSelector";
import { useAuth } from "./hooks/recoil/useAuth";
import "./App.scss";

function createStaticRoute(path: string) {
  return {
    getPath: () => path,
    template: path,
  };
}
export const Routes = {
  HOME: createStaticRoute("/"),
  NEW_PROJECT: createStaticRoute("/projects/new"),
  LIST_PROJECTS: createStaticRoute("/projects/all"),
  EDIT_PROJECTS: {
    //todo try better types when ts 4.1 releases
    getPath: (projectId: string) => `/project/${projectId}/edit`,
    template: "/projects/:projectId/edit",
  },
};

function App() {
  const auth = useAuth();

  if (!auth.isAuthenticated && (!auth.isLoading || !auth.isAuthSaved)) {
    return <Login />;
  }
  return (
    <>
      <Header />
      <Switch>
        <Route path={Routes.NEW_PROJECT.template}>
          <ProjectCreator />
        </Route>
        <Route path={Routes.LIST_PROJECTS.template}>
          <ProjectSelector />
        </Route>
        <Route path={Routes.EDIT_PROJECTS.template}>
          <ProjectEditor />
        </Route>
        <Route path={Routes.HOME.template}>
          <Home />
        </Route>
      </Switch>
    </>
  );
}

export default App;
