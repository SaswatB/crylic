import { startCase } from "lodash";

import { CodeEntry, OutlineElement } from "../types/paint";
import { Project } from "./Project";

export const STYLE_EXTENSION_REGEX = /\.(css|s[ac]ss|less)$/;
export const SCRIPT_EXTENSION_REGEX = /\.[jt]sx?$/;

export const isStyleEntry = (codeEntry: CodeEntry) =>
  !!codeEntry.filePath.match(STYLE_EXTENSION_REGEX);

export const getStyleEntryExtension = (codeEntry: CodeEntry) =>
  codeEntry.filePath.match(STYLE_EXTENSION_REGEX)?.[1] as
    | "css"
    | "scss"
    | "sass"
    | "less"
    | undefined;

export const isScriptEntry = (codeEntry: CodeEntry) =>
  !!codeEntry.filePath.match(SCRIPT_EXTENSION_REGEX);

export function getFileExtensionLanguage({ filePath }: CodeEntry) {
  if (filePath.match(/\.[jt]sx?$/)) {
    return "typescript";
  } else if (filePath.match(/\.css$/)) {
    return "css";
  } else if (filePath.match(/\.s[ac]ss$/)) {
    return "scss";
  } else if (filePath.match(/\.less$/)) {
    return "less";
  } else if (filePath.match(/\.(svg|html)$/)) {
    return "html";
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

export const buildOutline = (
  project: Project,
  element: Element
): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      const lookupId = project.primaryElementEditor.getLookupIdFromHTMLElement(
        child as HTMLElement
      );
      if (lookupId) {
        return [
          {
            tag: child.tagName,
            lookupId,
            element: child as HTMLElement,
            children: buildOutline(project, child),
          },
        ];
      }
      return buildOutline(project, child);
    })
    .reduce((p, c) => [...p, ...c], []);

let reactInstanceKey: string | undefined;
export const getReactDebugId = (element: HTMLElement) => {
  if (!reactInstanceKey)
    reactInstanceKey = Object.keys(element).find((key) =>
      key.startsWith("__reactInternalInstance")
    );
  if (!reactInstanceKey) return undefined;

  return (element as any)[reactInstanceKey]?._debugID;
};
