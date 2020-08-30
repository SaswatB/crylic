import { useEffect } from "react";
import { Observable } from "rxjs";

import { useUpdatingRef } from "./useUpdatingRef";

export function useObservableCallback<T>(
  observable: Observable<T> | undefined,
  onChange: (value: T | undefined) => void
) {
  const onChangeRef = useUpdatingRef(onChange);
  useEffect(() => {
    if (!observable) return undefined;

    // use setTimeout to avoid setting state during a react render
    const subscription = observable.subscribe((newValue) =>
      setTimeout(() => onChangeRef.current(newValue))
    );
    return () => {
      subscription.unsubscribe();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      onChangeRef.current(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observable]);
}
