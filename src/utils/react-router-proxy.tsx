import React from "react";

export function getReactRouterProxy() {
// onRoutesDefined: () => void,
// onRouteChange: () => void
  const reactRouterDom = require("react-router-dom") as typeof import("react-router-dom");
  const reactRouterDomProxy = {
    ...reactRouterDom,
    Link: (props: any) => {
      // todo test ref
      const { Link } = reactRouterDom;
      console.log("Link", props);
      // todo handle object/function links
      return <Link {...props} data-paintLink={props.to} />;
    },
    NavLink: (props: any) => {
      // todo test ref
      const { NavLink } = reactRouterDom;
      console.log("NavLink", props);
      // todo handle object/function links
      return <NavLink {...props} data-paintLink={props.to} />;
    },
    Route: (props: any) => {
      // todo test ref
      const { Route } = reactRouterDom;
      console.log("Route", props);
      return <Route {...props} />;
    },
    // todo maybe stub switch from react-router itself?
    Switch: (props: any) => {
      // todo test ref
      const { Switch } = reactRouterDom;
      console.log("Switch", props);
      props.children.forEach((child: any) => {
        if (React.isValidElement(child)) {
          console.log("Switch Child", child.props);
        }
      });
      return <Switch {...props} />;
    },
  };
  return reactRouterDomProxy;
}
