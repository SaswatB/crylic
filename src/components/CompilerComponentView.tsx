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
import { Styles } from "../types/paint";
import { webpackRunCodeWithWorker } from "../utils/compilers/run-code-webpack-worker";
import { Project } from "../utils/Project";
import { ErrorBoundary } from "./ErrorBoundary";
import { Frame } from "./Frame";

export const getComponentElementFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  componentView: CompilerComponentViewRef | null | undefined
) => {
  const boundingBox = (event.target as HTMLDivElement).getBoundingClientRect();
  const x = event.clientX - boundingBox.x;
  const y = event.clientY - boundingBox.y;
  return componentView?.getElementAtPoint(x, y);
};

export type GetElementByLookupId = (
  lookupId: string
) => HTMLElement | null | undefined;

export interface CompilerComponentViewRef {
  getRootElement(): HTMLBodyElement | undefined;
  getElementAtPoint: (x: number, y: number) => HTMLElement | undefined;
  getElementByLookupId: GetElementByLookupId;
  // cleared on next compile
  addTempStyles: (
    lookupId: string,
    styles: Styles,
    persistRender: boolean
  ) => void;
}

export type OnCompileEndCallback = (
  codeId: string,
  context: {
    iframe: HTMLIFrameElement;
    onRoutesDefined: Observable<string[]>;
    onRouteChange: Observable<string>;
  } & CompilerComponentViewRef
) => void;

export interface CompilerComponentViewProps {
  project: Project | undefined;
  selectedCodeId: string;
  onCompileStart?: () => void;
  onCompileEnd?: OnCompileEndCallback;
}

export const CompilerComponentView: FunctionComponent<
  CompilerComponentViewProps &
    React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<CompilerComponentViewRef>
> = forwardRef(
  (
    { project, selectedCodeId, onCompileStart, onCompileEnd, ...props },
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
      getElementAtPoint(x, y) {
        const iframeDocument = getActiveFrame().current?.frameElement
          .contentDocument;
        return (iframeDocument?.elementFromPoint(x, y) || undefined) as
          | HTMLElement
          | undefined;
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

    const errorBoundary = useRef<ErrorBoundary>(null);
    const [BootstrapElement, setBootstrapElement] = useState<any>();
    const [CompiledElement, setCompiledElement] = useState<any>();
    const [debouncedCodeEntries] = useDebounce(project?.codeEntries, 150);
    useEffect(() => {
      (async () => {
        if (project && debouncedCodeEntries?.length) {
          try {
            onCompileStart?.();
            console.log("compiling", selectedCodeId, project);
            const onRoutesDefinedSubject = new ReplaySubject<string[]>(1);
            const onRouteChangeSubject = new ReplaySubject<string>(1);
            const codeExports = await webpackRunCodeWithWorker(
              project,
              selectedCodeId,
              {
                window: getInactiveFrame().current?.frameElement.contentWindow,
                onRoutesDefined(routes) {
                  onRoutesDefinedSubject.next(routes);
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
                onCompileEnd?.(selectedCodeId, {
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
    }, [debouncedCodeEntries]);

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
