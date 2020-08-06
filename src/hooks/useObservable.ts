import { useState } from "react";
import { Observable } from "rxjs";

import { useObservableCallback } from "./useObservableCallback";

export function useObservable<T>(observable?: Observable<T>) {
  const [value, setValue] = useState<T>();
  useObservableCallback(observable, setValue);
  return value;
}
