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
import { isEqual } from "lodash";
import { Observable, ReplaySubject } from "rxjs";
import { distinctUntilChanged } from "rxjs/operators";

import { useDebounce } from "../hooks/useDebounce";
import { useUpdatingRef } from "../hooks/useUpdatingRef";
import { RenderEntry, Styles } from "../types/paint";
import { webpackRunCodeWithWorker } from "../utils/compilers/run-code-webpack-worker";
import { Project } from "../utils/Project";
import { RouteDefinition } from "../utils/react-router-proxy";
import { ErrorBoundary } from "./ErrorBoundary";
import { Frame } from "./Frame";

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

export type GetElementByLookupId = (
  lookupId: string
) => HTMLElement | null | undefined;

export interface CompilerComponentViewRef {
  getRootElement(): HTMLBodyElement | undefined;
  getElementsAtPoint: (x: number, y: number) => HTMLElement[];
  getElementByLookupId: GetElementByLookupId;
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
  onNewPublishUrl?: (url: string) => void;
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
      onNewPublishUrl,
      ...props
    },
    ref
  ) => {
    const [tempStyles, setTempStyles] = useState<Record<string, Styles>>({});
    const [activeFrame, setActiveFrame] = useState(1);
    const frame1 = useRef<{
      frameElement: HTMLIFrameElement;
    }>(null);
    const frame2 = useRef<{
      frameElement: HTMLIFrameElement;
    }>(null);

    const handle: CompilerComponentViewRef = {
      getRootElement() {
        const iframeDocument = getActiveFrame().current?.frameElement
          .contentDocument;
        return iframeDocument?.querySelector("body") || undefined;
      },
      getElementsAtPoint(x, y) {
        const iframeDocument = getActiveFrame().current?.frameElement
          .contentDocument;
        return (iframeDocument?.elementsFromPoint(x, y) || []) as HTMLElement[];
      },
      getElementByLookupId(lookupId) {
        const iframeDocument = getActiveFrame().current?.frameElement
          .contentDocument;
        return (
          iframeDocument &&
          project?.primaryElementEditor.getHTMLElementByLookupId(
            iframeDocument,
            lookupId
          )
        );
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

    const getActiveFrame = () => (activeFrame === 1 ? frame1 : frame2);
    const getInactiveFrame = () => (activeFrame === 1 ? frame2 : frame1);

    const lastPublishUrl = useRef<string>();
    if (!renderEntry.publish && lastPublishUrl.current) {
      // clear publish url if the render entry isn't published
      lastPublishUrl.current = undefined;
    }

    const errorBoundary = useRef<ErrorBoundary>(null);
    const [BootstrapElement, setBootstrapElement] = useState<any>();
    const [CompiledElement, setCompiledElement] = useState<any>();
    const [debouncedCodeEntries] = useDebounce(project?.codeEntries, 150);
    useEffect(() => {
      (async () => {
        if (project && debouncedCodeEntries?.length) {
          try {
            console.log("compiling", renderEntry.codeId, project);
            const onProgressSubject = new ReplaySubject<{
              percentage: number;
              message: string;
            }>(1);
            const onRoutesDefinedSubject = new ReplaySubject<RouteDefinition>(
              1
            );
            const onRouteChangeSubject = new ReplaySubject<string>(1);

            onCompileStart?.({
              onProgress: onProgressSubject.pipe(distinctUntilChanged(isEqual)),
            });

            const codeExports = await webpackRunCodeWithWorker(
              project,
              renderEntry,
              {
                window: getInactiveFrame().current?.frameElement.contentWindow,
                onProgress(arg) {
                  onProgressSubject.next(arg);
                },
                onPublish(url) {
                  if (url !== lastPublishUrl.current) {
                    lastPublishUrl.current = url;
                    onNewPublishUrl?.(url);
                  }
                },
                onRoutesDefined(arg) {
                  onRoutesDefinedSubject.next(arg);
                },
                onRouteChange(route) {
                  onRouteChangeSubject.next(route);
                },
              }
            );
            setTempStyles({});
            // if nothing was returned, the compilation was likely preempted
            if (!codeExports) return;
            console.log("codeExports", codeExports);

            setBootstrapElement(() =>
              Object.values(codeExports.bootstrap || {}).find(
                (e): e is Function => typeof e === "function"
              )
            );
            setCompiledElement(() =>
              Object.values(codeExports.component).find(
                (e): e is Function => typeof e === "function"
              )
            );

            getActiveFrame().current?.frameElement.contentDocument?.location.reload();
            if (errorBoundary.current?.hasError()) {
              errorBoundary.current.resetError();
            }

            // wait until the dom is fully updated so that getElementByLookupId can work with the updated view
            setTimeout(() =>
              requestAnimationFrame(() =>
                onCompileEnd?.(renderEntry, {
                  ...handleRef.current,
                  iframe: getInactiveFrame().current!.frameElement,
                  onRoutesDefined: onRoutesDefinedSubject.pipe(
                    distinctUntilChanged(isEqual)
                  ),
                  onRouteChange: onRouteChangeSubject.pipe(
                    distinctUntilChanged()
                  ),
                })
              )
            );

            // flip the active frame
            setActiveFrame(activeFrame === 1 ? 2 : 1);
          } catch (e) {
            console.log(e);
          }
        }
      })().catch(console.log);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedCodeEntries, renderEntry.publish]);

    const applyTempStyles = (newTempStyles: typeof tempStyles) => {
      Object.entries(newTempStyles).forEach(([lookupId, styles]) => {
        const element = handle.getElementByLookupId(lookupId) as HTMLElement;
        console.log("applying temp styles");
        styles.forEach(({ styleName, styleValue }) => {
          // @ts-ignore ignore read-only css props
          element.style[styleName] = styleValue;
        });
      });
    };

    useLayoutEffect(() => applyTempStyles(tempStyles));

    const Wrapper = BootstrapElement || React.Fragment;
    const renderFrameContent = () => (
      <ErrorBoundary
        ref={errorBoundary}
        onError={(error, errorInfo) => {
          console.log(error, errorInfo);
        }}
      >
        <Wrapper>
          {CompiledElement && React.createElement(CompiledElement)}
        </Wrapper>
      </ErrorBoundary>
    );

    return (
      <>
        <Frame
          {...props}
          style={{
            ...props.style,
            ...(activeFrame !== 1 && { display: "none" }),
          }}
          ref={frame1}
        >
          {activeFrame === 1 && renderFrameContent()}
        </Frame>
        <Frame
          {...props}
          style={{
            ...props.style,
            ...(activeFrame !== 2 && { display: "none" }),
          }}
          ref={frame2}
        >
          {activeFrame === 2 && renderFrameContent()}
        </Frame>
      </>
    );
  }
);
