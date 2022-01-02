import Worker from "worker-loader!./ast-worker";

import type { AstWorkerModule } from "./ast-worker";

const worker = new Worker();

const pendingActions: Record<
  string,
  { resolve: Function; reject: Function }
> = {};

worker.onmessage = (event) => {
  const { id, result, error } = event.data;

  const handler = pendingActions[id];
  if (!handler) {
    console.error("unhandled event", event);
    return;
  }

  if (error) handler.reject(error);
  else handler.resolve(result);

  delete pendingActions[id];
};

export function queueAstPoolAction<T extends keyof AstWorkerModule>(
  action: T,
  ...args: Parameters<AstWorkerModule[T]>
): Promise<ReturnType<AstWorkerModule[T]>> {
  const id = Math.random().toString();
  const promise = new Promise(
    (resolve, reject) => (pendingActions[id] = { resolve, reject })
  );
  worker.postMessage({ id, action, args });

  return promise as Promise<ReturnType<AstWorkerModule[T]>>;
}
