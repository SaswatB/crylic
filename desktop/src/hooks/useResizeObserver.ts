import { useEffect } from "react";

import { useUpdatingRef } from "./useUpdatingRef";

const resizeObserverCallbacks = new WeakMap<
  Element,
  ((entry: ResizeObserverEntry) => void)[]
>();
// it's recommended that to only use one resize observer for observing elements, no matter how many
const resizeObserver = new ResizeObserver((entries) => {
  for (let entry of entries) {
    const callbacks = resizeObserverCallbacks.get(entry.target);
    callbacks?.forEach((c) => c(entry));
  }
});

export function useResizeObserver(
  element: Element | undefined,
  callback: (entry: ResizeObserverEntry) => void
) {
  const callbackRef = useUpdatingRef(callback);
  useEffect(() => {
    if (!element) return;

    // if this element hasn't been tracked yet, add it to the resize observer's observation list
    if (!resizeObserverCallbacks.has(element)) {
      resizeObserver.observe(element, { box: "border-box" });
    }
    // keep track of the given callback
    const callbacks = [...(resizeObserverCallbacks.get(element) || [])];
    const callbackCurrent = (entry: ResizeObserverEntry) =>
      callbackRef.current(entry);
    callbacks.push(callbackCurrent);
    resizeObserverCallbacks.set(element, callbacks);

    // unsubscribe function
    return () => {
      // remove the given callback from the list for the given element
      const callbacks = [
        ...(resizeObserverCallbacks.get(element) || []),
      ].filter((c) => c !== callbackCurrent);
      if (callbacks.length === 0) {
        // if there are no more callbacks for the given element, remove it from the resize observer
        resizeObserver.unobserve(element);
        resizeObserverCallbacks.delete(element);
      } else {
        resizeObserverCallbacks.set(element, callbacks);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [element]);
}
