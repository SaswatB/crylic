/**
 * Prevents an async function from being called in parallel
 * Any calls to this function will be queued until the previous call completes
 */
export function throttleAsync<U>(fn: () => Promise<U>): () => Promise<U> {
  let currentPromise: Promise<U> | undefined = undefined;
  let nextPromise: Promise<U> | undefined = undefined;
  let nextPromiseResolve: ((p: Promise<U>) => void) | undefined = undefined;

  const finishPromise = () => {
    currentPromise = undefined;
    if (nextPromiseResolve) {
      currentPromise = fn();
      currentPromise.finally(finishPromise);

      nextPromiseResolve(currentPromise);
      nextPromise = undefined;
      nextPromiseResolve = undefined;
    }
  };

  return () => {
    if (!currentPromise) {
      currentPromise = fn();
      currentPromise.finally(finishPromise);
      return currentPromise;
    } else if (!nextPromise) {
      nextPromise = new Promise((resolve) => {
        nextPromiseResolve = resolve;
      });
    }
    return nextPromise;
  };
}
