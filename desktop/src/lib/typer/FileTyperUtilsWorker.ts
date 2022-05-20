import * as Comlink from "comlink";

import { RemoteCodeEntry } from "synergy/src/lib/project/CodeEntry";
import { TyperUtils } from "synergy/src/lib/typer/TyperUtils";

import { FilePortablePath } from "../project/FilePortablePath";

const ts = __non_webpack_require__("typescript") as typeof import("typescript");

let typerUtils: TyperUtils | undefined;
const codeEntries: RemoteCodeEntry[] = [];
const bootstrap = {
  init(projectPath: string, newCodeEntries: RemoteCodeEntry[]) {
    codeEntries.push(...newCodeEntries);
    typerUtils = new TyperUtils(
      new FilePortablePath(projectPath),
      codeEntries,
      ts.sys
    );
  },
  updateCodeEntries(newCodeEntries: RemoteCodeEntry[]) {
    // lm_9dfd4feb9b this doesn't support delete as is
    for (const entry of newCodeEntries) {
      const index = codeEntries.findIndex((e) => e.id === entry.id);
      if (index !== -1) codeEntries[index] = entry;
      codeEntries.push(entry);
    }
  },
};

export type FileTyperUtilsWorker = typeof bootstrap & TyperUtils;

const worker = new Proxy(bootstrap, {
  get(target, propKey) {
    if (propKey in target) return target[propKey as keyof typeof target];

    const value = typerUtils?.[propKey as keyof TyperUtils];
    if (typeof value === "function") return value.bind(typerUtils);
    return value;
  },
});

Comlink.expose(worker);
