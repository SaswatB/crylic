import { namedTypes as t } from "ast-types";
import { camelCase, upperFirst } from "lodash";
import path from "path";

import { SCRIPT_EXTENSION_REGEX } from "../ext-regex";
import type { RemoteCodeEntry } from "../project/CodeEntry";
import { getComponentExport, parseCodeEntryAST } from "./ast-helpers";

const workerModule = {
  async computeMetadata(remoteCodeEntry: RemoteCodeEntry) {
    // parse ast data
    let ast = parseCodeEntryAST(remoteCodeEntry);

    // check if the file is a component
    let isRenderable = false;
    let exportName = undefined;
    let exportIsDefault = undefined;
    if (
      remoteCodeEntry.isRenderableScriptExtension ||
      remoteCodeEntry.isBootstrap
    ) {
      const componentExport = getComponentExport(ast as t.File);
      const baseComponentName = upperFirst(
        camelCase(
          path
            .basename(remoteCodeEntry.filePath)
            .replace(SCRIPT_EXTENSION_REGEX, "")
        )
      );
      if (componentExport) {
        isRenderable = !remoteCodeEntry.isBootstrap;
        exportName = componentExport.name || baseComponentName;
        exportIsDefault =
          remoteCodeEntry.config.forceUseComponentDefaultExports ||
          componentExport.isDefault;
      } else if (remoteCodeEntry.config.disableComponentExportsGuard) {
        // since static analysis failed but we still need allow this file as a component guess that it's a default export
        isRenderable = !remoteCodeEntry.isBootstrap;
        exportName = baseComponentName;
        exportIsDefault = true;
      }
    }

    return {
      rawAst: ast,
      isRenderable,
      exportName,
      exportIsDefault,
    };
  },
};
export type AstWorkerModule = typeof workerModule;

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", (event) => {
  const { id, action, args } = event.data;

  // @ts-expect-error ignore type error for spread operator
  workerModule[action as keyof AstWorkerModule](...args)
    // eslint-disable-next-line no-restricted-globals
    .then((result) => self.postMessage({ id, result }))
    // eslint-disable-next-line no-restricted-globals
    .catch((error) => self.postMessage({ id, error }));
});
