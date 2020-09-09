import { useEffect } from "react";
import { useBus } from "ts-bus/react";
import { BusEvent, EventCreatorFn } from "ts-bus/types";

import { useUpdatingRef } from "./useUpdatingRef";

export function useBusSubscription<T extends BusEvent>(
  subscription: EventCreatorFn<T>,
  handler: (p: ReturnType<typeof subscription>["payload"]) => void
) {
  const bus = useBus();
  const handlerRef = useUpdatingRef(handler);
  useEffect(
    () =>
      bus.subscribe(subscription, ({ payload }) => handlerRef.current(payload)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
}
