import { Draft } from "immer";
import { debounce } from "lodash";

import { produceNext } from "../utils";
import { LTBehaviorSubject } from "./LTBehaviorSubject";
import { LTObservable, LTSubscription } from "./LTObservable";

export interface LTOperator<S, T> {
  next(value: S, emit: (value: T | LTObservable<T>) => void): void;
  clearState?(): void;
}

export function ltMap<S, T>(
  map: (value: S) => T | Promise<T> | LTObservable<T>
): LTOperator<S, T> {
  return {
    next: async (value, emit) => emit(await map(value)),
  };
}

export function ltEagerFlatten<T>(): LTOperator<
  LTObservable<T>[],
  (T | undefined)[]
> {
  let subSubscriptions: LTSubscription[] | undefined;
  const resetSubSubscriptions = () => {
    subSubscriptions?.forEach((s) => s.unsubscribe());
    subSubscriptions = undefined;
  };

  return {
    next: async (value, emit) => {
      const cache = new LTBehaviorSubject(
        ([] as (T | undefined)[]).fill(undefined, 0, value.length)
      );

      resetSubSubscriptions();
      subSubscriptions = value.map((o, i) =>
        o.subscribe((subValue) =>
          produceNext(cache, (draft) => (draft[i] = subValue as Draft<T>))
        )
      );

      emit(cache);
    },
    clearState: resetSubSubscriptions,
  };
}

export function ltDebounce<T>(timeout: number): LTOperator<T, T> {
  const debouncer = debounce((func: () => void) => func(), timeout);
  return {
    next: (value, emit) => debouncer(() => emit(value)),
    clearState: () => debouncer.cancel(),
  };
}
