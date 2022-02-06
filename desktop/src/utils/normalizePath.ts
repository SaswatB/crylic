export function normalizePath(p: string, pathSep: string) {
  return p.replace(/(\\|\/)/g, pathSep);
}
