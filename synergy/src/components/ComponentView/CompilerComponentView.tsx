import React, {
  FunctionComponent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import produce from "immer";
import { flatten, isEqual, uniq } from "lodash";
import { Observable, ReplaySubject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";
import { useBus } from "ts-bus/react";

import { useCompilerContextRecoil } from "../../hooks/recoil/useCompilerContextRecoil";
import { useProjectRecoil } from "../../hooks/recoil/useProjectRecoil";
import { useDebounce } from "../../hooks/useDebounce";
import { componentViewCompileEnd, componentViewReload } from "../../lib/events";
import { RouteDefinition } from "../../lib/react-router-proxy";
import { isDefined } from "../../lib/utils";
import {
  RenderEntry,
  RenderEntryDeployerContext,
  Styles,
  ViewContext,
} from "../../types/paint";
import { ErrorBoundary } from "../ErrorBoundary";
import { Frame } from "../Frame";

export type CompileContext = {
  onProgress: Observable<{ percentage: number; message: string }>;
};

export interface CompilerComponentViewProps {
  renderEntry: RenderEntry;
  compiler: { deploy: (context: RenderEntryDeployerContext) => Promise<void> };
  onCompileStart?: (compileContext: CompileContext) => void;
  onCompileEnd?: (renderEntry: RenderEntry, context: ViewContext) => void;
  onCompileError?: (e: Error) => void;
  onNewPublishUrl?: (url: string) => void;
  onReload?: (renderEntry: RenderEntry) => void;
}

export const CompilerComponentView: FunctionComponent<
  CompilerComponentViewProps & React.IframeHTMLAttributes<HTMLIFrameElement>
> = ({
  renderEntry,
  compiler,
  onCompileStart,
  onCompileEnd,
  onCompileError,
  onNewPublishUrl,
  onReload,
  ...props
}) => {
  const bus = useBus();
  const { project } = useProjectRecoil();
  const { setViewContext, runCompileTasks } = useCompilerContextRecoil();
  const frame = useRef<{
    frameElement: HTMLIFrameElement;
  }>(null);

  const lastPublishUrl = useRef<string>();
  if (!renderEntry.publish && lastPublishUrl.current) {
    // clear publish url if the render entry isn't published
    lastPublishUrl.current = undefined;
  }

  // track route info per frame
  const onRoutesDefinedSubjectRef = useRef(
    new ReplaySubject<RouteDefinition>(1)
  );
  const onRouteChangeSubjectRef = useRef(new ReplaySubject<string>(1));

  // helper for getting elements by a lookup id
  const getElementsByLookupId = (lookupId: string) => {
    const iframeDocument = frame.current?.frameElement.contentDocument;
    return iframeDocument && project
      ? project.primaryElementEditor.getHTMLElementsByLookupId(
          iframeDocument,
          lookupId
        )
      : [];
  };

  // handle temp styles
  const applyTempStyles = (newTempStyles: typeof tempStyles) => {
    Object.entries(newTempStyles).forEach(([lookupId, styles]) => {
      const elements = getElementsByLookupId(lookupId);
      console.log("applying temp styles");
      styles.forEach(({ styleName, styleValue }) => {
        elements.forEach((element) => {
          // @ts-ignore ignore read-only css props
          element.style[styleName] = styleValue;
        });
      });
    });
  };
  const [tempStyles, setTempStyles] = useState<Record<string, Styles>>({});
  useLayoutEffect(() => applyTempStyles(tempStyles));

  const errorBoundary = useRef<ErrorBoundary>(null);
  const [debouncedCodeEntries] = useDebounce(project?.codeEntries, 150);
  useEffect(() => {
    (async () => {
      if (!project || !debouncedCodeEntries?.length) return;
      try {
        console.log("compiling", renderEntry.codeId, project);
        const onProgressSubject = new ReplaySubject<{
          percentage: number;
          message: string;
        }>(1);

        onCompileStart?.({
          onProgress: onProgressSubject.pipe(distinctUntilChanged(isEqual)),
        });

        const switchContext: Record<string, RouteDefinition | undefined> = {};
        const routeContext: Record<string, string | undefined> = {};
        const refreshRouteDefined = () => {
          const switches = Object.values(switchContext).filter(isDefined);
          if (switches.length > 0) {
            const arg = {
              // todo add ability to select switch to target instead of choosing the first one here
              ...switches[0],
              // combine all the routes defined by all the switches
              routes: uniq(flatten(switches.map((s) => s.routes))),
            };
            onRoutesDefinedSubjectRef.current.next(arg);
          }
        };
        const refreshRouteChange = () => {
          const routes = Object.values(routeContext).filter(isDefined);
          if (routes.length) {
            // get the most specific route
            let route = routes[0];
            routes.forEach((r) => {
              if (r.length > route.length) route = r;
            });
            onRouteChangeSubjectRef.current.next(route);
          }
        };
        await compiler.deploy({
          project,
          renderEntry,
          frame: frame.current?.frameElement,
          onProgress(arg) {
            onProgressSubject.next(arg);
          },
          onPublish(url) {
            if (url !== lastPublishUrl.current) {
              lastPublishUrl.current = url;
              onNewPublishUrl?.(url);
            }
          },
          onReload() {
            onReload?.(renderEntry);
            bus.publish(componentViewReload({ renderEntry }));
          },
          onSwitchActive(id, arg) {
            switchContext[id] = arg;
            refreshRouteDefined();
          },
          onSwitchDeactivate(id) {
            delete switchContext[id];
            refreshRouteDefined();
          },
          onRouteActive(id, route) {
            routeContext[id] = route;
            refreshRouteChange();
          },
          onRouteDeactivate(id) {
            delete routeContext[id];
            refreshRouteChange();
          },
        });
        setTempStyles({});

        if (errorBoundary.current?.hasError()) {
          errorBoundary.current.resetError();
        }

        // wait until the dom is fully updated so that getElementsByLookupId can work with the updated view
        setTimeout(() =>
          requestAnimationFrame(() => {
            if (!frame.current) return;

            // construct the view context
            const viewContext: ViewContext = {
              iframe: frame.current!.frameElement,
              onRoutesDefined: onRoutesDefinedSubjectRef.current.pipe(
                distinctUntilChanged(isEqual)
              ),
              onRouteChange: onRouteChangeSubjectRef.current.pipe(
                distinctUntilChanged()
              ),

              getRootElement() {
                const iframeDocument =
                  frame.current?.frameElement.contentDocument;
                return iframeDocument?.querySelector("body") || undefined;
              },
              getElementsAtPoint(x, y) {
                const iframeDocument =
                  frame.current?.frameElement.contentDocument;
                return (iframeDocument?.elementsFromPoint(x, y) ||
                  []) as HTMLElement[];
              },
              getElementsByLookupId,
              addTempStyles(lookupId, styles, persistRender) {
                const newTempStyles = produce(tempStyles, (draft) => {
                  draft[lookupId] = [...(draft[lookupId] || []), ...styles];
                });
                applyTempStyles(newTempStyles);
                if (persistRender) setTempStyles(newTempStyles);
              },
            };
            // save the new context
            setViewContext(renderEntry.id, viewContext);

            // fire all related events
            onCompileEnd?.(renderEntry, viewContext);
            runCompileTasks(renderEntry.id, viewContext);
            bus.publish(
              componentViewCompileEnd({
                renderEntry,
                viewContext,
              })
            );
          })
        );
      } catch (e) {
        console.log(e);
        errorBoundary.current?.setError(e);
        onCompileError?.(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCodeEntries, renderEntry.publish]);

  return <Frame {...props} ref={frame} />;
};
