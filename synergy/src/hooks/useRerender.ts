import { useCallback, useState } from "react";

/**
 * Returns a callback that can be used to rerender the current component
 */
export function useRerender() {
  const [, setCounter] = useState(0);
  return useCallback(() => setCounter((c) => c + 1), []);
}
