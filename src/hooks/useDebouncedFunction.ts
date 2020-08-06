import { useRef } from "react";
import { debounce } from "lodash";

import { useUpdatingRef } from "./useUpdatingRef";

export function useDebouncedFunction<R, S extends Array<R>>(
  func: (...args: S) => void,
  delay: number,
  debounceFunction = debounce
) {
  const functionRef = useUpdatingRef(func);
  const debouncedFunctionRef = useRef(
    debounceFunction<(...args: S) => void>(
      (...args) => functionRef.current(...args),
      delay
    )
  );

  return debouncedFunctionRef.current;
}
