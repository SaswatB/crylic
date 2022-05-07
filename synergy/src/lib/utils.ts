import produce, { Draft } from "immer";
import { BehaviorSubject, Observable } from "rxjs";
import { take } from "rxjs/operators";

import {
  CSS_STYLE_GROUP_TYPE,
  INLINE_STYLE_GROUP_TYPE,
  STYLED_COMPONENTS_STYLE_GROUP_TYPE,
  StyleGroup,
} from "./ast/editors/ASTEditor";
import { LTBehaviorSubject } from "./lightObservable/LTBehaviorSubject";
import { LTObservable, LTSubscription } from "./lightObservable/LTObservable";

export function isDefined<T>(v: T | undefined | null): v is T {
  return v !== undefined && v !== null;
}

export const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));

const emailRegex =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
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

export function getBestStyleGroup(
  styleGroups: StyleGroup[],
  previousStyleGroup: StyleGroup | undefined
) {
  // if the previous style group is available, use it
  if (previousStyleGroup) {
    const sg = styleGroups.find(
      (s) => previousStyleGroup.lookupId === s.lookupId
    );
    if (sg) return sg;
  }

  // todo make this configurable
  if (styleGroups.length > 1) {
    // prefer styled components
    const scSg = styleGroups.find(
      (s) => s.type === STYLED_COMPONENTS_STYLE_GROUP_TYPE
    );
    if (scSg) return scSg;
    // prefer css classes that seem to be specific to the element
    // css regex: https://stackoverflow.com/questions/448981/which-characters-are-valid-in-css-class-names-selectors
    const cssSg = styleGroups.find(
      (s) =>
        s.type === CSS_STYLE_GROUP_TYPE &&
        s.name.match(/^\.-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/)
    );
    if (cssSg) return cssSg;
    // fallback to inline
    const inlineSg = styleGroups.find(
      (s) => s.type === INLINE_STYLE_GROUP_TYPE
    );
    if (inlineSg) return inlineSg;
  }

  return styleGroups[0];
}
