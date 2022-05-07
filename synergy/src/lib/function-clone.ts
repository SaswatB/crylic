function visit<T extends object>(
  obj: T,
  func: <U>(obj: U, k: keyof U) => void,
  visitedObjects = new WeakSet()
) {
  visitedObjects.add(obj);

  for (const k in obj) {
    func(obj, k);

    if (
      obj[k] !== null &&
      typeof obj[k] === "object" &&
      !visitedObjects.has(obj[k] as unknown as object)
    )
      visit(obj[k] as unknown as object, func, visitedObjects);
  }
}

export function stringifyFunctions<T extends object>(obj: T) {
  visit(obj, (o, k) => {
    if (typeof o[k] === "function")
      o[k] = {
        t: "function_lm_51b86cff7e",
        v: (o[k] as unknown as Function).toString(),
      } as any;
  });
  return obj;
}

export function unstringifyFunctions<T extends object>(obj: T) {
  visit(obj, (o, k) => {
    if (
      o[k] !== null &&
      typeof o[k] === "object" &&
      (o[k] as any).t === "function_lm_51b86cff7e"
    ) {
      try {
        o[k] = eval(`(${(o[k] as unknown as { v: string }).v})`) as any;
      } catch (e) {
        console.error(e, o[k]);
      }
    }
  });
  return obj;
}
