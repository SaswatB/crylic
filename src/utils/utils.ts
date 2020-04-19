import { CodeEntry } from "../types/paint";

export function getFriendlyName(
  codeEntries: CodeEntry[],
  selectedIndex: number
) {
  // todo get a more specific name if this simple name conflicts with another code entry
  return codeEntries[selectedIndex]?.filePath
    ?.replace(/^.*(\/|\\)/, "")
    ?.replace(/\.(jsx?|tsx?)$/, "");
}
