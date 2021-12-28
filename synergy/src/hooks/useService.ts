import { useMemo } from "react";
import { container, InjectionToken } from "tsyringe";

export function useService<T>(token: InjectionToken<T>): T {
  return useMemo(() => container.resolve(token), [token]);
}
