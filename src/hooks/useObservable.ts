import { useEffect, useState } from "react";
import { Observable } from "rxjs";

export function useObservable<T>(observable?: Observable<T>) {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    if (!observable) return undefined;

    // use setTimeout to avoid setting state during a react render
    const subscription = observable.subscribe((newValue) =>
      setTimeout(() => setValue(newValue))
    );
    return () => {
      subscription.unsubscribe();
      setValue(undefined);
    };
  }, [observable]);
  return value;
}
