declare module "deep-freeze-strict" {
  export = <T>(v: T): readonly T => v;
}
