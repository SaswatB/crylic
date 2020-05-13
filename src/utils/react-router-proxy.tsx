import React from "react";
import { isArray, omit } from "lodash";

const LINK_DATA_ATTR = "paintlink";

export interface RouteDefinition {
  routes: string[];
  switchProps: object | undefined;
  history: import("history").History;
}

export function getReactRouterProxy(
  onRoutesDefined: (arg: RouteDefinition) => void,
  onRouteChange: (route: string) => void
) {
  const reactRouterDom = require("react-router-dom") as typeof import("react-router-dom");
  const reactRouterDomProxy = {
    ...reactRouterDom,
    BrowserRouter: reactRouterDom.MemoryRouter,
    HashRouter: reactRouterDom.MemoryRouter,
    Link: (props: any) => {
      // todo test ref
      const { Link } = reactRouterDom;
      // console.log("Link", props);
      // todo handle object/function links
      return <Link {...props} {...{ [`data-${LINK_DATA_ATTR}`]: props.to }} />;
    },
    NavLink: (props: any) => {
      // todo test ref
      const { NavLink } = reactRouterDom;
      // console.log("NavLink", props);
      // todo handle object/function links
      return (
        <NavLink {...props} {...{ [`data-${LINK_DATA_ATTR}`]: props.to }} />
      );
    },
    Route: (props: any) => {
      // todo test ref
      const { Route } = reactRouterDom;
      // console.log("Route", props);
      onRouteChange(props.path);
      return <Route {...props} />;
    },
    // todo maybe stub switch from react-router itself?
    Switch: (props: any) => {
      // todo test ref
      const { Switch, useHistory } = reactRouterDom;
      const history = useHistory();
      const routes: string[] = [];
      const children = !props.children
        ? []
        : isArray(props.children)
        ? props.children
        : [props.children];
      // console.log("Switch", props);
      children.forEach((child: any) => {
        if (React.isValidElement(child) && "path" in (child.props as any)) {
          routes.push((child.props as any).path);
          // console.log("Switch Child", child.props);
        }
      });
      onRoutesDefined({
        routes,
        switchProps: omit(props, "children"),
        history,
      });
      return <Switch {...props} />;
    },
  };
  return reactRouterDomProxy;
}
