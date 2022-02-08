import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { debounce, isEqual } from "lodash";
import { Observable, ReplaySubject } from "rxjs";
import { debounceTime, distinctUntilChanged, map } from "rxjs/operators";
import { useBus } from "ts-bus/react";

import { useMemoObservable } from "../../hooks/useObservable";
import { useRerender } from "../../hooks/useRerender";
import { useService } from "../../hooks/useService";
import { useUpdatingRef } from "../../hooks/useUpdatingRef";
import { componentViewCompileEnd, componentViewReload } from "../../lib/events";
import { arrayMap } from "../../lib/utils";
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
  onDomChange?: () => void; // debounced listener on any DOM changes within the iframe
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
  onDomChange,
  ...props
}) => {
  const bus = useBus();
  const rerender = useRerender();
  const project = useProject();
  const compilerContextService = useService(CompilerContextService);
  const frame = useRef<{
    frameElement: HTMLIFrameElement;
  }>(null);
  const frameMutationObserver = useRef<MutationObserver>(null);

  const lastPublishUrl = useRef<string>();
  if (!renderEntry.publish && lastPublishUrl.current) {
    // clear publish url if the render entry isn't published
    lastPublishUrl.current = undefined;
  }

  const onDomChangeRef = useUpdatingRef(onDomChange);
  /**
   * Register a listener on any DOM changes within the iframe
   */
  const registerMutationObserver = useCallback(() => {
    const observer =
      frameMutationObserver.current ||
      (frameMutationObserver.current,
      new MutationObserver(debounce(() => onDomChangeRef.current?.(), 100)));
    const element = frame.current?.frameElement.contentDocument?.body;

    if (element) {
      observer.observe(element, {
        childList: true,
        subtree: true,
      });
    }
  }, [onDomChangeRef]);

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
    void (async () => {
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
            registerMutationObserver();
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
              iframe: frame.current.frameElement,

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
