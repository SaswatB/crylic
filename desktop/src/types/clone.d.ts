declare module "clone" {
  export = <T>(
    v: T,
    circular?: boolean,
    depth?: number,
    prototype?: object,
    includeNonEnumerable?: boolean
  ): T => v;
}
