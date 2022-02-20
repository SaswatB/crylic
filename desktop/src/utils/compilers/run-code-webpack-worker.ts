import React from "react";
import ReactDOMServer from "react-dom/server";

import { ErrorBoundary } from "synergy/src/components/ErrorBoundary";
import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { Project } from "synergy/src/lib/project/Project";
import { RenderEntryDeployerContext } from "synergy/src/lib/project/RenderEntry";
import { findFiber } from "synergy/src/lib/react-dev-tools";
import { ltTakeNext } from "synergy/src/lib/utils";
import { ReactDevToolsHook } from "synergy/src/types/react-devtools";

import {
  WebpackRendererMessagePayload_CompileFinished,
  WebpackRendererMessagePayload_PercentUpdate,
} from "../../types/ipc";
import { publishComponent, unpublishComponent } from "../publish-component";
import { getAppNodeModules } from "../utils";
import { reactDevToolsFactory } from "./helpers/react-dev-tools-factory";
import { webpackRunCode } from "./run-code-webpack";

import errorBoundaryComponent from "!!raw-loader!synergy/src/components/ErrorBoundary";

const path = __non_webpack_require__("path") as typeof import("path");

const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

const HMR_STATUS_HANDLER_PROP = "__crylicHmrStatusHandler";
const ROOT_COMPONENT_PROP = "__crylicComponentRoot";
const WORKER_ENABLED = true;

const progressCallbacks: Record<
  number,
  (data: WebpackRendererMessagePayload_PercentUpdate) => void
> = {};
const compileCallbacks: Record<
  number,
  (data: WebpackRendererMessagePayload_CompileFinished) => void
> = {};

if (WORKER_ENABLED) {
  // start the worker
  console.log("starting webpack worker");
  ipcRenderer.on("webpack-renderer-message", (e, data) => {
    switch (data.type) {
      case "percent-update":
        progressCallbacks[data.compileId]?.(data);
        break;
      case "compile-finished":
        compileCallbacks[data.compileId]?.(data);
        break;
    }
  });
  // initialize the worker with the local node modules
  ipcRenderer.send("webpack-worker-message", {
    action: "initialize",
    nodeModulesPath: getAppNodeModules(),
  });
}

const getImportFromCodeEntry = async (local: string, codeEntry: CodeEntry) => {
  const exportIsDefault = await ltTakeNext(codeEntry.exportIsDefault$);
  const exportName = await ltTakeNext(codeEntry.exportName$);

  let declaration;
  if (exportIsDefault || !exportName) {
    declaration = local;
  } else if (exportName === local) {
    declaration = `{ ${local} }`;
  } else {
    declaration = `{ ${exportName} as ${local} }`;
  }

  const src = codeEntry.filePath.replace(/\\/g, "\\\\");
  return `import ${declaration} from "${src}";`;
};

const generateBundleCode = async (
  project: Project,
  componentCodeEntry: CodeEntry
) => {
  const componentImport = await getImportFromCodeEntry(
    "Component",
    componentCodeEntry
  );

  const bootstrapCodeEntry = project.codeEntries$
    .getValue()
    .find((c) => c.isBootstrap());
  const bootstrapImport = bootstrapCodeEntry
    ? await getImportFromCodeEntry("Bootstrap", bootstrapCodeEntry)
    : "";

  return `
import React, { ErrorInfo } from "react";
import ReactDOM from "react-dom";
${componentImport}
${bootstrapImport}

${errorBoundaryComponent
  .replace('import React, { ErrorInfo } from "react";', "")
  .replace("export", "")}

try {
  Component.${ROOT_COMPONENT_PROP} = true
} catch (e) {}
ReactDOM.render((
  <ErrorBoundary>
    ${
      bootstrapCodeEntry
        ? "<Bootstrap><Component /></Bootstrap>"
        : "<Component />"
    }
  </ErrorBoundary>),
  document.getElementById("${project.config.getHtmlTemplateSelector()}")
);

if ((module || {}).hot && (window || {}).${HMR_STATUS_HANDLER_PROP}) {
  module.hot.addStatusHandler(window.${HMR_STATUS_HANDLER_PROP});
}
`.trim();
};

let compileIdCounter = 0;

/**
 * Runs `webpackRunCode` on a worker
 */
export const webpackRunCodeWithWorker = async ({
  project,
  renderEntry,
  frame,
  onPublish,
}: RenderEntryDeployerContext) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;
  const componentCodeEntry = renderEntry.codeEntry;
  const bundleCodeEntry = {
    id: `bundle-${renderEntry.codeId}`,
    code: await generateBundleCode(project, componentCodeEntry),
    filePath: path.join(project.sourceFolderPath, "paintbundle.tsx"),
  };

  const trimEntry = async (codeEntry: CodeEntry) => ({
    id: codeEntry.id,
    filePath: codeEntry.filePath,
    codeRevisionId: codeEntry.codeRevisionId,
  });
  const codeEntries = await Promise.all(
    project.codeEntries$.getValue().map(trimEntry)
  );
  console.log("compiling codeEntries", codeEntries);

  const config = {
    disableWebpackExternals:
      project.config.configFile?.webpack?.overrideConfig
        ?.disableExternalsInjection,
    paths: {
      projectFolder: project.path,
      projectSrcFolder: project.sourceFolderPath,
      overrideWebpackConfig: project.config.getFullOverrideWebpackPath(),
      htmlTemplate: project.config.getFullHtmlTemplatePath(),
    },
  };

  const takeNextCode = async (codeEntryId: string) => {
    const codeEntry = project.getCodeEntryValue(codeEntryId);
    console.log("takeNextCode", codeEntry);
    return codeEntry
      ? (await ltTakeNext(codeEntry.codeWithLookupData$)) ||
          codeEntry.code$.getValue()
      : undefined;
  };
  const onProgress = (payload: { percentage: number; message: string }) =>
    renderEntry.compileProgress$.next(payload);

  let devport: number | null;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    const workerCallback = new Promise<{ result: number | null }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
    progressCallbacks[compileId] = onProgress;

    const codeFetchHandler = async (
      _: unknown,
      d: { type: string; codeEntryId: string }
    ) => {
      if (d.type !== "code-request") return;

      ipcRenderer.send("webpack-renderer-message-" + d.codeEntryId, {
        action: "code-response",
        code: await takeNextCode(d.codeEntryId),
      });
    };
    ipcRenderer.on("webpack-renderer-message", codeFetchHandler);

    // set a message to the worker for compiling code
    ipcRenderer.send("webpack-worker-message", {
      action: "compile",
      codeEntries,
      primaryCodeEntry: bundleCodeEntry,
      compileId,
      config,
    });

    // wait for the worker to compile
    ({ result: devport } = await workerCallback);

    ipcRenderer.off("webpack-renderer-message", codeFetchHandler);
    delete compileCallbacks[compileId];
    delete progressCallbacks[compileId];
  } else {
    devport = await webpackRunCode(
      codeEntries,
      bundleCodeEntry,
      config,
      onProgress,
      (codeEntryId) => takeNextCode(codeEntryId)
    );
  }

  const workerCallbackTime = Date.now();

  frame!.onload = () => {
    console.log("frame onload");
    const frameWindow = frame!.contentWindow! as Window & {
      paintErrorDisplayed?: boolean;
      require?: (module: string) => unknown;
      exports?: unknown;
      [HMR_STATUS_HANDLER_PROP]?: (status: string) => void;
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: Partial<ReactDevToolsHook>;
      paintBundle: () => void;
    };

    const errorHandler = (error: Error) => {
      const body = frame!.contentDocument!.querySelector("body")!;
      body.style.margin = "0px";
      body.innerHTML = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error })
      );
      frameWindow.paintErrorDisplayed = true;
      return true;
    };
    frameWindow.addEventListener("error", (e) => errorHandler(e.error));

    // run the resulting bundle on the provided iframe, with stubs
    frameWindow.exports = {};
    let hasHmrApplied = false;
    // listener for HMR updates
    frameWindow[HMR_STATUS_HANDLER_PROP] = (status) => {
      if (status === "apply") hasHmrApplied = true;
      else if (status === "idle" && hasHmrApplied) {
        // run the callback on an idle after an apply
        hasHmrApplied = false;
        // todo try to avoid timeout
        setTimeout(() => renderEntry.viewReloaded$.next(), 100);
      }
    };

    frameWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = reactDevToolsFactory(
      (root) => {
        renderEntry.reactMetadata$.next({
          fiberRoot: root,
          get fiberComponentRoot() {
            const componentRoot = findFiber(
              root.current,
              (fiber) =>
                fiber.type?.[ROOT_COMPONENT_PROP] ||
                fiber.elementType?.[ROOT_COMPONENT_PROP]
            );
            return componentRoot || root.current;
          },
        });
      }
    );

    try {
      frameWindow.paintBundle();
    } catch (error) {
      errorHandler(error as Error);
    }
    delete frameWindow[HMR_STATUS_HANDLER_PROP];
    delete frameWindow.exports;
    // devtools hook is purposely not deleted
    renderEntry.viewReloaded$.next();
  };
  if (
    // todo fix tiny edge case where 'includes' here has a false positive
    !frame!.contentWindow!.location.href.includes(`${devport}`) ||
    (frame!.contentWindow! as any).paintErrorDisplayed
  ) {
    frame!.contentWindow!.location.href = `http://localhost:${devport}/`;
    console.log("refreshing iframe");
  }

  // todo fix
  // if (renderEntry.publish) {
  //   const url = await publishComponent(renderEntry.codeId, bundle!);
  //   console.log("published:", url);
  //   onPublish(url);
  // } else {
  //   unpublishComponent(renderEntry.codeId);
  // }

  const endCallbackTime = Date.now();

  console.log(
    "webpackRunCodeWithWorker times",
    endCallbackTime - startTime,
    endCallbackTime - workerCallbackTime,
    workerCallbackTime - startTime
  );
};
