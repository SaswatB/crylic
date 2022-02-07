import produce, { Draft } from "immer";
import { uniqueId } from "lodash";
import { BehaviorSubject, Observable } from "rxjs";
import { map, mergeAll, mergeMap, scan, take } from "rxjs/operators";

import { LTBehaviorSubject } from "./lightObservable/LTBehaviorSubject";
import { LTObservable, LTSubscription } from "./lightObservable/LTObservable";

export const getElementUniqueId = (element: HTMLElement): string => {
  if (!(element as any).paintId) {
    (element as any).paintId = uniqueId();
  }
  return (element as any).paintId;
};

export function isDefined<T>(v: T | undefined | null): v is T {
  return v !== undefined && v !== null;
}

export const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
export function validateEmail(email: string) {
  return emailRegex.test(String(email).toLowerCase());
}

export const onEnter = (apply: () => void) => (event: { key: string }) => {
  if (event.key === "Enter") apply();
};

export const produceNext = <T extends object>(
  subject: BehaviorSubject<T> | LTBehaviorSubject<T>,
  update: (draft: Draft<T>) => void
) =>
  subject.next(
    produce(subject.getValue(), (draft) => {
      update(draft);
    })
  );

export const takeNext = <T>(source: Observable<T>) => {
  const promise = source.pipe(take(1)).toPromise();
  let done = false;
  promise.finally(() => (done = true));
  // warning if this doesn't resolve quickly
  // setTimeout(() => {
  //   if (!done) {
  //     console.trace("takeNext promise not resolved quickly", {
  //       source,
  //     });
  //   }
  // }, 100);
  return promise;
};

export const ltTakeNext = <T>(source: LTObservable<T>): Promise<T> => {
  return new Promise((resolve) => {
    let isResolved = false;
    let subscription: LTSubscription | undefined = undefined;
    subscription = source.subscribe((value) => {
      if (isResolved) return;
      isResolved = true;

      setTimeout(() => subscription!.unsubscribe(), 1);
      resolve(value);
    });
  });
};

export const arrayMap = <T, R>(
  mapper: (value: T) => Observable<R>,
  getId: (value: R) => string
) => (source: Observable<Array<T>>): Observable<Array<R>> =>
  source.pipe(
    mergeAll(), // flatten observable array into a stream of values
    mergeMap(mapper), // map T => R
    scan(
      // collect R into an object
      // lm_9dfd4feb9b if an object is deleted from the source array, it's old value will be stuck here
      (acc, value) => ({ ...acc, [getId(value)]: value }),
      {} as Record<string, R>
    ),
    map((e) => Object.values(e)) // convert the object into an array for the final result
  );
