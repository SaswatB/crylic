import { startCase } from "lodash";

import { CodeEntry, OutlineElement, Project } from "../types/paint";
import { JSXASTEditor } from "./ast/editors/JSXASTEditor";

const STYLE_EXTENSION_REGEX = /\.(s?css|sass|less)$/;
const SCRIPT_EXTENSION_REGEX = /\.[jt]sx?$/;

export const isStyleEntry = (codeEntry: CodeEntry) =>
  !!codeEntry.filePath.match(STYLE_EXTENSION_REGEX);

export const isScriptEntry = (codeEntry: CodeEntry) =>
  !!codeEntry.filePath.match(SCRIPT_EXTENSION_REGEX);

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

export function getFriendlyName({ codeEntries }: Project, codeId: string) {
  const codeEntry = codeEntries.find(({ id }) => id === codeId)!;
  const fileName = codeEntry.filePath
    ?.replace(/^.*(\/|\\)/, "")
    ?.replace(SCRIPT_EXTENSION_REGEX, "")
    ?.replace(STYLE_EXTENSION_REGEX, "");
  if (!isScriptEntry(codeEntry) && !isStyleEntry(codeEntry)) {
    return fileName;
  }
  // todo get a more specific name if this simple name conflicts with another code entry
  return `${startCase(fileName)}${
    isStyleEntry(codeEntry) ? " (stylesheet)" : ""
  }`;
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
