import { startCase } from "lodash";

import { CodeEntry, OutlineElement } from "../types/paint";
import { JSX_LOOKUP_DATA_ATTR } from "./constants";

const STYLE_EXTENSION_REGEX = /\.(s?css|sass|less)$/;

export const isStyleEntry = (codeEntry: CodeEntry) =>
  !!codeEntry.filePath.match(STYLE_EXTENSION_REGEX);

export function getFileExtensionLanguage({ filePath }: CodeEntry) {
  if (filePath.match(/\.(jsx?|tsx?)$/)) {
    return "typescript";
  } else if (filePath.match(/\.(css)$/)) {
    return "css";
  } else if (filePath.match(/\.(s(a|c)ss)$/)) {
    return "scss";
  } else if (filePath.match(/\.(less)$/)) {
    return "less";
  }
  return "";
}

export function getFriendlyName(
  codeEntries: CodeEntry[],
  selectedIndex: number
) {
  // todo get a more specific name if this simple name conflicts with another code entry
  return `${startCase(
    codeEntries[selectedIndex]?.filePath
      ?.replace(/^.*(\/|\\)/, "")
      ?.replace(/\.(jsx?|tsx?)$/, "")
      ?.replace(STYLE_EXTENSION_REGEX, "")
  )}${isStyleEntry(codeEntries[selectedIndex]) ? " (stylesheet)" : ""}`;
}

export const buildOutline = (element: Element): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      if (JSX_LOOKUP_DATA_ATTR in (child as HTMLElement).dataset) {
        return [
          {
            tag: child.tagName,
            lookupId: (child as HTMLElement).dataset[JSX_LOOKUP_DATA_ATTR]!,
            children: buildOutline(child),
          },
        ];
      }
      return buildOutline(child);
    })
    .reduce((p, c) => [...p, ...c], []);
