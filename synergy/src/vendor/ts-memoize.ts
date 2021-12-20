// https://github.com/prismamedia/ts-memoize

type Function<TArgs extends any[], TResult> = (...args: TArgs) => TResult;

function memoizeHelper<TArgs extends any[], TResult, TKey>(
  originalFunction: Function<TArgs, TResult>,
  hashFunction?: Function<TArgs, TKey>
): (...args: TArgs) => TResult {
  const cachePropertyName = Symbol(
    `Memoized "${originalFunction.name}" function's cache`
  );

  return hashFunction
    ? function memoizedFunction(this: any, ...args: TArgs): TResult {
        let cache: Map<TKey, TResult>;
        if (this.hasOwnProperty(cachePropertyName)) {
          cache = this[cachePropertyName];
        } else {
          cache = new Map();

          Object.defineProperty(this, cachePropertyName, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: cache,
          });
        }

        const key = hashFunction.apply(this, args);

        let value: TResult;
        if (!cache.has(key)) {
          value = originalFunction.apply(this, args);

          cache.set(key, value);
        } else {
          value = cache.get(key) as TResult;
        }

        return value;
      }
    : function memoizedFunction(this: any): TResult {
        if (this.hasOwnProperty(cachePropertyName)) {
          return this[cachePropertyName] as TResult;
        }

        const value = originalFunction.apply(this);

        Object.defineProperty(this, cachePropertyName, {
          configurable: false,
          enumerable: false,
          writable: false,
          value,
        });

        return value;
      };
}

/**
 * The "memoize" decorator is used to avoid multiple computations for multiple calls of the same method or getter
 *
 * @param hashFunction Given the same arguments than the decorated method, it has to compute the cache key
 */
export function memoize(hashFunction?: (...args: any) => any): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    if (typeof descriptor.value === "function") {
      if (!hashFunction) {
        if (descriptor.value.length > 1) {
          throw TypeError(
            `${target.constructor.name}.${descriptor.value.name}'s "@Memoize()" decorator needs a "hashFunction" to compute a cache key`
          );
        } else if (descriptor.value.length === 1) {
          hashFunction = (...args: any) => args[0];
        }
      }

      descriptor.value = memoizeHelper(
        descriptor.value as any,
        hashFunction
      ) as any;
    } else if (typeof descriptor.get === "function") {
      descriptor.get = memoizeHelper(descriptor.get);
    } else {
      throw TypeError(
        `"@Memoize()" can be used only for method and getter: it has been used on ${target}.${String(
          propertyKey
        )}`
      );
    }
  };
}
