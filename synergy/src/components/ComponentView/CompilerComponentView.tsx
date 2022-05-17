import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { debounce } from "lodash";
import { debounceTime, map } from "rxjs/operators";

import { useMemoObservable, useObservable } from "../../hooks/useObservable";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { useRerender } from "../../hooks/useRerender";
import { useService } from "../../hooks/useService";
import {
  RenderEntry,
  RenderEntryCompileStatus,
  RenderEntryDeployerContext,
} from "../../lib/project/RenderEntry";
import { eagerMapArray } from "../../lib/rxjs/eagerMap";
import { PluginService } from "../../services/PluginService";
import { useProject } from "../../services/ProjectService";
import { StyleKeys, Styles, ViewContext } from "../../types/paint";
import { ErrorBoundary } from "../ErrorBoundary";
import { Frame } from "../Frame";

export interface CompilerComponentViewProps {
  renderEntry: RenderEntry;
  compiler: { deploy: (context: RenderEntryDeployerContext) => Promise<void> };
  onNewPublishUrl?: (url: string) => void;
}

export const CompilerComponentView: FunctionComponent<
  CompilerComponentViewProps & React.IframeHTMLAttributes<HTMLIFrameElement>
> = ({ renderEntry, compiler, onNewPublishUrl, ...props }) => {
  const rerender = useRerender();
  const project = useProject();
  const pluginService = useService(PluginService);
  const frame = useRef<{
    frameElement: HTMLIFrameElement;
  }>(null);
  const frameMutationObserver = useRef<MutationObserver>(null);

  const lastPublishUrl = useRef<string>();
  if (!renderEntry.publish && lastPublishUrl.current) {
    // clear publish url if the render entry isn't published
    lastPublishUrl.current = undefined;
  }

  /**
   * Register a listener for any DOM changes within the iframe
   */
  useObservableCallback(
    renderEntry.viewReloaded$,
    useCallback(() => {
      const observer =
        frameMutationObserver.current ||
        (frameMutationObserver.current,
        new MutationObserver(
          debounce(() => renderEntry.domChanged$.next(), 100)
        ));
      const element = frame.current?.frameElement.contentDocument?.body;

      if (element) {
        observer.observe(element, {
          childList: true,
          subtree: true,
        });
      }
    }, [renderEntry])
  );

  // rerender on props change
  const renderEntryComponentProps = useObservable(renderEntry.componentProps$);

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
        eagerMapArray((e) => e.code$.toRXJS().pipe(map((c) => ({ c, e }))), {
          waitForAll: true,
        }),
        debounceTime(150)
      ),
    [project]
  );
  useEffect(() => {
    void (async () => {
      if (!project || !debouncedCodeEntries?.length) return;
      try {
        await compiler.deploy({
          project,
          pluginService,
          renderEntry,
          frame: frame.current?.frameElement,
          onPublish(url) {
            if (url !== lastPublishUrl.current) {
              lastPublishUrl.current = url;
              onNewPublishUrl?.(url);
            }
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
                  tempStyles.current[lookupId]![styleName as StyleKeys] =
                    styleValue;
                });
                applyTempStyles();
                if (persistRender) rerender();
              },
            };
            // save the new context
            renderEntry.setViewContext(viewContext);

            // fire all related events
            renderEntry.updateCompileStatus(RenderEntryCompileStatus.COMPILED);
          })
        );
      } catch (e) {
        console.log(e);
        errorBoundary.current?.setError(e as Error);
        renderEntry.updateCompileStatus(RenderEntryCompileStatus.ERROR);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCodeEntries, renderEntry.publish, renderEntryComponentProps]);

  return <Frame {...props} ref={frame} />;
};
