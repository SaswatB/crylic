import type { TyperUtils } from "./TyperUtils";

export type TyperUtilsRunner = {
  [k in keyof TyperUtils]: TyperUtils[k] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : never;
};
