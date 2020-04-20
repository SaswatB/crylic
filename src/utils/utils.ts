import { startCase } from "lodash";

import { CodeEntry, OutlineElement } from "../types/paint";
import { JSXASTEditor } from "./ast/JSXASTEditor";

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
      const [lookupId] = new JSXASTEditor().getLookupIdsFromHTMLElement(
        child as HTMLElement
      );
      if (lookupId) {
        return [
          {
            tag: child.tagName,
            lookupId,
            children: buildOutline(child),
          },
        ];
      }
      return buildOutline(child);
    })
    .reduce((p, c) => [...p, ...c], []);
