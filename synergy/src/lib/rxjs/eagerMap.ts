import { Observable, OperatorFunction, Subscriber, Subscription } from "rxjs";

/**
 * Map to an inner observable
 * The subscription to the inner observable will be replaced if the outer observable emits a new value
 */
export function eagerMap<T, R>(
  map: (v: T) => Observable<R>
): OperatorFunction<T, R> {
  return (s) =>
    s.lift(function (this: Subscriber<R>, liftedSource: Observable<T>) {
      let innerSubscription: Subscription | undefined;
      const subscription = liftedSource.subscribe((value) => {
        innerSubscription?.unsubscribe();
        innerSubscription = map(value).subscribe((iv) => this.next(iv));
      });

      return () => {
        subscription.unsubscribe();
        innerSubscription?.unsubscribe();
      };
    });
}

/**
 * Map to an array of inner observables
 * The subscription to the inner observables will be replaced if the outer observable emits a new value
 */
export function eagerMapArray<T, R>(
  map: (v: T) => Observable<R>,
  o?: { waitForAll?: false }
): OperatorFunction<T[], (R | undefined)[]>;
export function eagerMapArray<T, R>(
  map: (v: T) => Observable<R>,
  o: { waitForAll: true }
): OperatorFunction<T[], R[]>;
export function eagerMapArray<T, R>(
  map: (v: T) => Observable<R>,
  { waitForAll = false } = {}
): OperatorFunction<T[], (R | undefined)[]> {
  return (s) =>
    s.lift(function (
      this: Subscriber<(R | undefined)[]>,
      liftedSource: Observable<T[]>
    ) {
      let innerSubscriptions: Subscription[] = [];
      let innerValues: (R | undefined)[] = [];
      let innerFilled: boolean[] = [];

      const subscription = liftedSource.subscribe((value) => {
        innerSubscriptions.forEach((innerSubscription) =>
          innerSubscription.unsubscribe()
        );
        (innerValues = []).length = value.length;
        innerValues.fill(undefined);
        (innerFilled = []).length = value.length;
        innerFilled.fill(false);

        innerSubscriptions = value.map((innerValue, index) =>
          map(innerValue).subscribe((iv) => {
            innerValues[index] = iv;
            innerFilled[index] = true;

            if (!waitForAll || innerFilled.every((v) => v))
              this.next([...innerValues]);
          })
        );
      });

      return () => {
        subscription.unsubscribe();
        innerSubscriptions.forEach((innerSubscription) =>
          innerSubscription.unsubscribe()
        );
      };
    });
}

/**
 * Map any value of an array of inner observables
 * The subscription to the inner observables will be replaced if the outer observable emits a new value
 */
export function eagerMapArrayAny<T, R>(
  map: (v: T) => Observable<R>
): OperatorFunction<T[], R> {
  return (s) =>
    s.lift(function (this: Subscriber<R>, liftedSource: Observable<T[]>) {
      let innerSubscriptions: Subscription[] = [];

      const subscription = liftedSource.subscribe((value) => {
        innerSubscriptions.forEach((innerSubscription) =>
          innerSubscription.unsubscribe()
        );

        innerSubscriptions = value.map((innerValue) =>
          map(innerValue).subscribe((iv) => this.next(iv))
        );
      });

      return () => {
        subscription.unsubscribe();
        innerSubscriptions.forEach((innerSubscription) =>
          innerSubscription.unsubscribe()
        );
      };
    });
}
