import { startCase } from "lodash";
import path from "path";

import { CodeEntry } from "../types/paint";
import { Project } from "./project/Project";

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