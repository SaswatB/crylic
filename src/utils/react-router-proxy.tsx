import React from "react";

const LINK_DATA_ATTR = "paintlink";

export function getReactRouterProxy(
  onRoutesDefined: (routes: string[]) => void,
  onRouteChange: (route: string) => void
) {
  const reactRouterDom = require("react-router-dom") as typeof import("react-router-dom");
  const reactRouterDomProxy = {
    ...reactRouterDom,
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
      const { Switch } = reactRouterDom;
      const routes: string[] = [];
      // console.log("Switch", props);
      props.children.forEach((child: any) => {
        if (React.isValidElement(child) && "path" in (child.props as any)) {
          routes.push((child.props as any).path);
          // console.log("Switch Child", child.props);
        }
      });
      onRoutesDefined(routes);
      return <Switch {...props} />;
    },
  };
  return reactRouterDomProxy;
}
