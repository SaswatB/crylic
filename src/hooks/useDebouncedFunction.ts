import { useRef } from "react";
import { debounce } from "lodash";

import { useUpdatingRef } from "./useUpdatingRef";

export function useDebouncedFunction<R, S extends Array<R>>(
  func: (...args: S) => void,
  delay: number
) {
  const functionRef = useUpdatingRef(func);
  const debouncedFunctionRef = useRef(
    debounce<(...args: S) => void>(
      (...args) => functionRef.current(...args),
      delay
    )
  );

  return debouncedFunctionRef.current;
}
