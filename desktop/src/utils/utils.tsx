import React from "react";
import { startCase, uniqueId } from "lodash";
import path from "path";
import { Readable } from "stream";

import { Project } from "../lib/project/Project";
import { CodeEntry, OutlineElement } from "../types/paint";

export const STYLE_EXTENSION_REGEX = /\.(css|s[ac]ss|less)$/i;
export const SCRIPT_EXTENSION_REGEX = /\.[jt]sx?$/i;
export const IMAGE_EXTENSION_REGEX = /\.(jpe?g|png|gif|svg)$/i;

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

export const isImageEntry = (codeEntry: CodeEntry) =>
  !!codeEntry.filePath.match(IMAGE_EXTENSION_REGEX);

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

export function isDefined<T>(v: T | undefined | null): v is T {
  return v !== undefined && v !== null;
}

export const buildOutline = (
  project: Project,
  renderId: string,
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
            tag: child.tagName.toLowerCase(),
            renderId,
            lookupId,
            element: child as HTMLElement,
            children: buildOutline(project, renderId, child),
          },
        ];
      }
      return buildOutline(project, renderId, child);
    })
    .reduce((p, c) => [...p, ...c], []);

// this doesn't work in prod
let reactInstanceKey: string | undefined;
export const getReactDebugId = (element: HTMLElement) => {
  if (!reactInstanceKey)
    reactInstanceKey = Object.keys(element).find((key) =>
      key.startsWith("__reactInternalInstance")
    );
  if (!reactInstanceKey) return undefined;

  return (element as any)[reactInstanceKey]?._debugID;
};

export const getElementUniqueId = (element: HTMLElement): string => {
  if (!(element as any).paintId) {
    (element as any).paintId = uniqueId();
  }
  return (element as any).paintId;
};

export function streamToString(stream: Readable) {
  const chunks: Uint8Array[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export const renderSeparator = (title?: string, action?: React.ReactNode) => (
  <div className="flex items-center">
    {title && (
      <span className="pb-1 mr-2 text-sm text-gray-500 whitespace-no-wrap">
        {title}
      </span>
    )}
    <div className="w-full my-5 border-gray-600 border-solid border-b" />
    {action || null}
  </div>
);

export const getRelativeImportPath = (codeEntry: CodeEntry, target: string) => {
  if (!target.startsWith("/") && !target.includes(":")) return target;

  // make absolute paths relative
  let newPath = path
    .relative(path.dirname(codeEntry.filePath.replace(/\\/g, "/")), target)
    .replace(/\\/g, "/")
    .replace(SCRIPT_EXTENSION_REGEX, "");

  if (!newPath.startsWith(".")) {
    newPath = `./${newPath}`;
  }
  return newPath;
};

export const sleep = (duration: number) =>
  new Promise((resolve) => setTimeout(resolve, duration));
