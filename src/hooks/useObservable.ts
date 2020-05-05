import { useEffect, useState } from "react";
import { Observable } from "rxjs";

export function useObservable<T>(observable?: Observable<T>) {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    if (!observable) return undefined;

    const subscription = observable.subscribe(setValue);
    return () => {
      subscription.unsubscribe();
      setValue(undefined);
    };
  }, [observable]);
  return value;
}
