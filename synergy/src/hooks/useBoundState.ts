import { useEffect, useState } from "react";

export function useBoundState<T>(boundValue: T | (() => T), bindActive = true) {
  const [value, setValue] = useState(boundValue);
  useEffect(() => {
    bindActive && setValue(boundValue);
  }, [bindActive, boundValue]);

  return [value, setValue] as const;
}
