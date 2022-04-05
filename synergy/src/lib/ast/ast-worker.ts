import { namedTypes as t } from "ast-types";
import { camelCase, upperFirst } from "lodash";
import path from "path";

import { SCRIPT_EXTENSION_REGEX } from "../ext-regex";
import type { RemoteCodeEntry } from "../project/CodeEntry";
import { getComponentExports, parseCodeEntryAST } from "./ast-helpers";

export const workerModule = {
  async computeMetadata(remoteCodeEntry: RemoteCodeEntry) {
    // parse ast data
    let ast = parseCodeEntryAST(remoteCodeEntry);

    // check if the file is a component
    let isRenderable = false;
    let isComponent = false;
    let exportName = undefined;
    let exportIsDefault = undefined;
    if (
      remoteCodeEntry.isRenderableScriptExtension ||
      remoteCodeEntry.isBootstrap
    ) {
      const { preferredExport } = getComponentExports(ast as t.File);
      const baseComponentName = upperFirst(
        camelCase(
          path
            .basename(remoteCodeEntry.filePath)
            .replace(SCRIPT_EXTENSION_REGEX, "")
        )
      );
      if (preferredExport) {
        isComponent = !remoteCodeEntry.isBootstrap;
        isRenderable = isComponent && !preferredExport.isStyledComponent;
        exportName = preferredExport.name || baseComponentName;
        exportIsDefault =
          remoteCodeEntry.config.forceUseComponentDefaultExports ||
          preferredExport.isDefault;
      } else if (remoteCodeEntry.config.disableComponentExportsGuard) {
        // since static analysis failed but we still need allow this file as a component guess that it's a default export
        isComponent = !remoteCodeEntry.isBootstrap;
        isRenderable = isComponent;
        exportName = baseComponentName;
        exportIsDefault = true;
      }
    }

    return {
      codeRevisionId: remoteCodeEntry.codeRevisionId,
      rawAst: ast,
      isRenderable,
      isComponent,
      exportName,
      exportIsDefault,
    };
  },
};
export type AstWorkerModule = typeof workerModule;

// eslint-disable-next-line no-restricted-globals
self.addEventListener("message", (event) => {
  const { id, action, args } = event.data;
  if (!id || !action || !args) return;

  // @ts-expect-error ignore type error for spread operator
  workerModule[action as keyof AstWorkerModule](...args)
    // eslint-disable-next-line no-restricted-globals
    .then((result) => self.postMessage({ id, result }))
    // eslint-disable-next-line no-restricted-globals
    .catch((error) => self.postMessage({ id, error }));
});
