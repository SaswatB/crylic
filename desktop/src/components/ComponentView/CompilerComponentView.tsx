import React, {
  forwardRef,
  FunctionComponent,
  RefAttributes,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import produce from "immer";
import { flatten, isEqual, uniq } from "lodash";
import { Observable, ReplaySubject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import { Frame } from "synergy/src/components//Frame";
import { ErrorBoundary } from "synergy/src/components/ErrorBoundary";
import { useDebounce } from "synergy/src/hooks/useDebounce";
import { useUpdatingRef } from "synergy/src/hooks/useUpdatingRef";
import { Project } from "synergy/src/lib/project/Project";
import { RouteDefinition } from "synergy/src/lib/react-router-proxy";
import { isDefined } from "synergy/src/lib/utils";
import { RenderEntry, Styles } from "synergy/src/types/paint";

import { webpackRunCodeWithWorker } from "../../utils/compilers/run-code-webpack-worker";

export const getComponentElementsFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  componentView: CompilerComponentViewRef | null | undefined,
  scale: number
) => {
  const boundingBox = (event.target as HTMLDivElement).getBoundingClientRect();
  const x = (event.clientX - boundingBox.x) / scale;
  const y = (event.clientY - boundingBox.y) / scale;
  return componentView?.getElementsAtPoint(x, y) || [];
};

export type GetElementsByLookupId = (lookupId: string) => HTMLElement[];

export interface CompilerComponentViewRef {
  getRootElement(): HTMLBodyElement | undefined;
  getElementsAtPoint: (x: number, y: number) => HTMLElement[];
  getElementsByLookupId: GetElementsByLookupId;
  // cleared on next compile
  addTempStyles: (
    lookupId: string,
    styles: Styles,
    persistRender: boolean
  ) => void;
}

export type CompileContext = {
  onProgress: Observable<{ percentage: number; message: string }>;
};

export type OnCompileStartCallback = (compileContext: CompileContext) => void;

export type ViewContext = {
  iframe: HTMLIFrameElement;
  onRoutesDefined: Observable<RouteDefinition>;
  onRouteChange: Observable<string>;
} & CompilerComponentViewRef;

export type OnCompileEndCallback = (
  renderEntry: RenderEntry,
  context: ViewContext
) => void;

export interface CompilerComponentViewProps {
  project: Project | undefined;
  renderEntry: RenderEntry;
  onCompileStart?: OnCompileStartCallback;
  onCompileEnd?: OnCompileEndCallback;
  onCompileError?: (e: Error) => void;
  onNewPublishUrl?: (url: string) => void;
  onReload?: (renderEntry: RenderEntry) => void;
}

export const CompilerComponentView: FunctionComponent<
  CompilerComponentViewProps &
    React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>
> = forwardRef(
  (
    {
      project,
      renderEntry,
      onCompileStart,
      onCompileEnd,
      onCompileError,
      onNewPublishUrl,
      onReload,
      ...props
    },
    ref
  ) => {
    const [tempStyles, setTempStyles] = useState<Record<string, Styles>>({});
    const frame = useRef<{
      frameElement: HTMLIFrameElement;
    }>(null);

    const handle: CompilerComponentViewRef = {
      getRootElement() {
        const iframeDocument = frame.current?.frameElement.contentDocument;
        return iframeDocument?.querySelector("body") || undefined;
      },
      getElementsAtPoint(x, y) {
        const iframeDocument = frame.current?.frameElement.contentDocument;
        return (iframeDocument?.elementsFromPoint(x, y) || []) as HTMLElement[];
      },
      getElementsByLookupId(lookupId) {
        const iframeDocument = frame.current?.frameElement.contentDocument;
        return iframeDocument && project
          ? project.primaryElementEditor.getHTMLElementsByLookupId(
              iframeDocument,
              lookupId
            )
          : [];
      },
      addTempStyles(lookupId, styles, persistRender) {
        const newTempStyles = produce(tempStyles, (draft) => {
          draft[lookupId] = [...(draft[lookupId] || []), ...styles];
        });
        applyTempStyles(newTempStyles);
        if (persistRender) setTempStyles(newTempStyles);
      },
    };
    const handleRef = useUpdatingRef(handle);
    useImperativeHandle(ref, () => handle);

    const lastPublishUrl = useRef<string>();
    if (!renderEntry.publish && lastPublishUrl.current) {
      // clear publish url if the render entry isn't published
      lastPublishUrl.current = undefined;
    }

    // track route info per frame
    // todo clear these onFrameLoad
    const onRoutesDefinedSubjectRef = useRef(
      new ReplaySubject<RouteDefinition>(1)
    );
    const onRouteChangeSubjectRef = useRef(new ReplaySubject<string>(1));

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
          await webpackRunCodeWithWorker(project, renderEntry, {
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
            requestAnimationFrame(
              () =>
                frame.current &&
                onCompileEnd?.(renderEntry, {
                  ...handleRef.current,
                  iframe: frame.current!.frameElement,
                  onRoutesDefined: onRoutesDefinedSubjectRef.current.pipe(
                    distinctUntilChanged(isEqual)
                  ),
                  onRouteChange: onRouteChangeSubjectRef.current.pipe(
                    distinctUntilChanged()
                  ),
                })
            )
          );
        } catch (e) {
          console.log(e);
          errorBoundary.current?.setError(e);
          onCompileError?.(e);
        }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedCodeEntries, renderEntry.publish]);

    const applyTempStyles = (newTempStyles: typeof tempStyles) => {
      Object.entries(newTempStyles).forEach(([lookupId, styles]) => {
        const elements = handle.getElementsByLookupId(lookupId);
        console.log("applying temp styles");
        styles.forEach(({ styleName, styleValue }) => {
          elements.forEach((element) => {
            // @ts-ignore ignore read-only css props
            element.style[styleName] = styleValue;
          });
        });
      });
    };

    useLayoutEffect(() => applyTempStyles(tempStyles));

    return <Frame {...props} ref={frame} />;
  }
);
