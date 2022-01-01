import { DependencyList, useMemo, useState } from "react";

import { BaseObservable, useObservableCallback } from "./useObservableCallback";
import { useUpdatingRef } from "./useUpdatingRef";

export function useObservable<T>(
  observable: BaseObservable<T> & { getValue(): T }
): T;
export function useObservable<T>(
  observable?: BaseObservable<T> & { getValue?(): T }
): T | undefined;
export function useObservable<T>(
  observable?: BaseObservable<T> & { getValue?(): T }
): T | undefined {
  const [value, setValue] = useState<T | undefined>(observable?.getValue?.()); // support getValue from BehaviorSubject
  const valueRef = useUpdatingRef(value);
  useObservableCallback(
    observable,
    (newValue) => valueRef.current !== newValue && setValue(newValue)
  );
  return value;
}

export function useMemoObservable<T>(
  factory: () => BaseObservable<T> & { getValue(): T },
  deps: DependencyList
): T;
export function useMemoObservable<T>(
  factory: () => BaseObservable<T> | undefined,
  deps: DependencyList
): T | undefined;
export function useMemoObservable<T>(
  factory: () => BaseObservable<T> | undefined,
  deps: DependencyList
) {
  return useObservable(useMemo(factory, deps));
}
