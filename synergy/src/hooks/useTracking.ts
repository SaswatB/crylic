import { useCallback, useEffect } from "react";
import Nucleus from "nucleus-nodejs";

export function track(
  eventName: string,
  data?: { [key: string]: string | number | boolean | undefined }
) {
  Nucleus.track(eventName, data as Record<string, string>);
}

export function useTracking(
  eventName: string,
  options?: {
    onMount?: boolean;
    data?: { [key: string]: string | number | boolean };
  }
) {
  const trackEvent = useCallback(() => track(eventName, options?.data), [
    eventName,
    options,
  ]);
  useEffect(() => {
    if (options?.onMount) trackEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return trackEvent;
}
