import { useEffect } from "react";

import { useUpdatingRef } from "./useUpdatingRef";

export interface BaseObservable<T> {
  subscribe(
    callback: (newValue: T) => void
  ): {
    unsubscribe(): void;
  };
}

export function useObservableCallback<T>(
  observable: BaseObservable<T> | undefined,
  onChange: (value: T | undefined) => void,
  {
    disableClearOnObservableChange,
  }: { disableClearOnObservableChange?: boolean } = {}
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
      if (!disableClearOnObservableChange) onChangeRef.current(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observable]);
}
