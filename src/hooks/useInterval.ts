import { useEffect } from "react";

import { useUpdatingRef } from "./useUpdatingRef";

export function useInterval<T>(callback: () => void, period: number) {
  const callbackRef = useUpdatingRef(callback);
  useEffect(() => {
    const interval = setInterval(() => callbackRef.current(), period);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
