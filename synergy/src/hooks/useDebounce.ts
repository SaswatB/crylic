import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [skipNextDebounce, setSkipNextDebounce] = useState(false);

  useEffect(
    () => {
      if (skipNextDebounce) {
        setDebouncedValue(value);
        setSkipNextDebounce(false);
        return undefined;
      }
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value]
  );

  return [debouncedValue, () => setSkipNextDebounce(true)] as const;
}
