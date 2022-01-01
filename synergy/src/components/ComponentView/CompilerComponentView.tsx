import React, {
  FunctionComponent,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { flatten, isEqual, uniq } from "lodash";
import { Observable, ReplaySubject } from "rxjs";
import { debounceTime, distinctUntilChanged, map } from "rxjs/operators";
import { useBus } from "ts-bus/react";

import { useMemoObservable } from "../../hooks/useObservable";
import { useRerender } from "../../hooks/useRerender";
import { useService } from "../../hooks/useService";
import { componentViewCompileEnd, componentViewReload } from "../../lib/events";
import { RouteDefinition } from "../../lib/react-router-proxy";
import { arrayMap, isDefined } from "../../lib/utils";
import { CompilerContextService } from "../../services/CompilerContextService";
import { useProject } from "../../services/ProjectService";
import {
  RenderEntry,
  RenderEntryDeployerContext,
  StyleKeys,
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
  const rerender = useRerender();
  const project = useProject();
  const compilerContextService = useService(CompilerContextService);
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
  const tempStyles = useRef<Record<string, Styles>>({});
  const applyTempStyles = () => {
    Object.entries(tempStyles.current).forEach(([lookupId, styles]) => {
      const elements = getElementsByLookupId(lookupId);
      console.log("applying temp styles");
      Object.entries(styles).forEach(([styleName, styleValue]) => {
        elements.forEach((element) => {
          element.style[styleName as StyleKeys] = styleValue!;
        });
      });
    });
  };
  useLayoutEffect(() => applyTempStyles());

  const errorBoundary = useRef<ErrorBoundary>(null);

  const debouncedCodeEntries = useMemoObservable(
    () =>
      project?.codeEntries$.toRXJS().pipe(
        arrayMap(
          (e) => e.code$.toRXJS().pipe(map((c) => ({ c, e }))),
          (v) => v.e.id
        ),
        debounceTime(150)
      ),
    [project]
  );
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
              ...switches[0]!,
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
            let route = routes[0]!;
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

        // clear temp styles
        tempStyles.current = {};

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
                tempStyles.current[lookupId] =
                  tempStyles.current[lookupId] || {};
                Object.entries(styles).forEach(([styleName, styleValue]) => {
                  tempStyles.current[lookupId]![
                    styleName as StyleKeys
                  ] = styleValue;
                });
                applyTempStyles();
                if (persistRender) rerender();
              },
            };
            // save the new context
            compilerContextService.setViewContext(renderEntry.id, viewContext);

            // fire all related events
            onCompileEnd?.(renderEntry, viewContext);
            compilerContextService.runCompileTasks(renderEntry.id, viewContext);
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
        errorBoundary.current?.setError(e as Error);
        onCompileError?.(e as Error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCodeEntries, renderEntry.publish]);

  return <Frame {...props} ref={frame} />;
};
