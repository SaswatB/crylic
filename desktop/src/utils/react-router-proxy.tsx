import React, { useEffect, useRef } from "react";
import { isArray, omit } from "lodash";

import { useUpdatingRef } from "synergy/src/hooks/useUpdatingRef";

import { createBrowserHistory, createHashHistory } from "../vendor/history";

const LINK_DATA_ATTR = "paintlink";

export interface RouteDefinition {
  routes: string[];
  switchProps: object | undefined;
  historyRef: React.MutableRefObject<import("history").History>;
}

export function getReactRouterProxy(
  iframeWindow: Window,
  onSwitchActive: (switchId: string, arg: RouteDefinition) => void,
  onSwitchDeactivate: (switchId: string) => void,
  onRouteActive: (routeId: string, route: string) => void,
  onRouteDeactivate: (routeId: string) => void
) {
  const reactRouterDom = require("react-router-dom") as typeof import("react-router-dom");
  const reactRouterDomProxy = {
    ...reactRouterDom,
    BrowserRouter: (props: any) => {
      const historyRef = useRef<any>(
        createBrowserHistory({ ...(props || {}), window: iframeWindow })
      );
      return (
        <reactRouterDom.Router
          history={historyRef.current}
          children={props.children}
        />
      );
    },
    HashRouter: (props: any) => {
      const historyRef = useRef<any>(
        createHashHistory({ ...(props || {}), window: iframeWindow })
      );
      return (
        <reactRouterDom.Router
          history={historyRef.current}
          children={props.children}
        />
      );
    },
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

      // track this route while it's being rendered
      useEffect(() => {
        console.log("Route", props);
        const id = `${Math.random()}`;
        onRouteActive(id, props.path);
        return () => onRouteDeactivate(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [props.path]);

      return <Route {...props} />;
    },
    // todo maybe stub switch from react-router itself?
    Switch: (props: any) => {
      // todo test ref
      const { Switch, useHistory } = reactRouterDom;
      const history = useHistory();
      const historyRef = useUpdatingRef(history);

      const routes: string[] = [];
      const children = !props.children
        ? []
        : isArray(props.children)
        ? props.children
        : [props.children];
      children.forEach((child: any) => {
        if (React.isValidElement(child) && "path" in (child.props as any)) {
          routes.push((child.props as any).path);
          // console.log("Switch Child", child.props);
        }
      });

      // track this switch while it's being rendered
      useEffect(() => {
        console.log("Switch", props);
        const id = `${Math.random()}`;
        onSwitchActive(id, {
          routes,
          switchProps: omit(props, "children"),
          historyRef,
        });
        return () => onSwitchDeactivate(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [routes.join()]);

      return <Switch {...props} />;
    },
  };
  return reactRouterDomProxy;
}
