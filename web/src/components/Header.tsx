import React, { FunctionComponent } from "react";
import { NavLink, useHistory } from "react-router-dom";
import { faSignOutAlt } from "@fortawesome/free-solid-svg-icons";

import { IconButton } from "synergy/src/components/IconButton";

import { Routes } from "../App";
import { useAuth } from "../hooks/recoil/useAuth";

export const Header: FunctionComponent = () => {
  const history = useHistory();
  const auth = useAuth();
  return (
    <div className="header">
      <NavLink exact to={Routes.HOME.getPath()} activeClassName="">
        Crylic
      </NavLink>
      <NavLink
        to={Routes.LIST_PROJECTS.getPath()}
        isActive={(match, location) =>
          !!location.pathname.startsWith("/projects")
        }
      >
        Projects
      </NavLink>
      <div className="flex-1" />
      <IconButton
        className="px-2"
        icon={faSignOutAlt}
        title="Sign Out"
        onClick={() => {
          auth.logout();
          history.push(Routes.HOME.getPath());
        }}
      />
    </div>
  );
};
