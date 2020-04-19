import { startCase } from "lodash";

import { CodeEntry, OutlineElement } from "../types/paint";
import { JSX_LOOKUP_DATA_ATTR } from "./constants";

export function getFriendlyName(
  codeEntries: CodeEntry[],
  selectedIndex: number
) {
  // todo get a more specific name if this simple name conflicts with another code entry
  return startCase(
    codeEntries[selectedIndex]?.filePath
      ?.replace(/^.*(\/|\\)/, "")
      ?.replace(/\.(jsx?|tsx?)$/, "")
  );
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
