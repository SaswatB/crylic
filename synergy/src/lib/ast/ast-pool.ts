import Worker from "worker-loader!./ast-worker";

import type { AstWorkerModule } from "./ast-worker";

const worker = new Worker();
// const worker = new Worker("./ast-worker", { type: "module" });

const pendingActions: Record<string, Function> = {};

worker.onmessage = (event) =>
  requestIdleCallback(
    () => {
      if (event.data.id in pendingActions) {
        pendingActions[event.data.id]?.(event.data.result);
        delete pendingActions[event.data.id];
      } else {
        console.error("unhandled event", event);
      }
    },
    { timeout: 100 }
  );

export function queueAstPoolAction<T extends keyof AstWorkerModule>(
  action: T,
  ...args: Parameters<AstWorkerModule[T]>
): Promise<ReturnType<AstWorkerModule[T]>> {
  const id = Math.random().toString();
  const promise = new Promise((resolve) => (pendingActions[id] = resolve));
  worker.postMessage({ id, action, args });

  return promise as Promise<ReturnType<AstWorkerModule[T]>>;
}
