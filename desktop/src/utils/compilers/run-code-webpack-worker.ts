import React from "react";
import ReactDOMServer from "react-dom/server";

import { ErrorBoundary } from "synergy/src/components/ErrorBoundary";
import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { Project } from "synergy/src/lib/project/Project";
import { getReactRouterProxy } from "synergy/src/lib/react-router-proxy";
import { ltTakeNext, sleep } from "synergy/src/lib/utils";
import { RenderEntryDeployerContext } from "synergy/src/types/paint";

import {
  WebpackRendererMessagePayload_CompileFinished,
  WebpackRendererMessagePayload_PercentUpdate,
} from "../../types/ipc";
import { DEFAULT_HTML_TEMPLATE_SELECTOR } from "../constants";
import { publishComponent, unpublishComponent } from "../publish-component";
import { webpackRunCode } from "./run-code-webpack";

import errorBoundaryComponent from "!!raw-loader!synergy/src/components/ErrorBoundary";

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");

const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

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
  let nodeModulesPath = __non_webpack_require__
    .resolve("webpack")
    .replace(/(app[/\\])?node_modules[/\\].*$/, "");
  if (fs.existsSync(path.join(nodeModulesPath, "desktop"))) {
    // only for dev
    nodeModulesPath = path.join(nodeModulesPath, "desktop");
  }
  if (fs.existsSync(path.join(nodeModulesPath, "app"))) {
    nodeModulesPath = path.join(nodeModulesPath, "app");
  }
  nodeModulesPath = path.join(nodeModulesPath, "node_modules/");
  ipcRenderer.send("webpack-worker-message", {
    action: "initialize",
    nodeModulesPath,
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

  const rootSelector =
    project.config.configFile?.htmlTemplate?.rootSelector ||
    DEFAULT_HTML_TEMPLATE_SELECTOR;

  return `
import React, { ErrorInfo } from "react";
import ReactDOM from "react-dom";
${componentImport}
${bootstrapImport}

${errorBoundaryComponent
  .replace('import React, { ErrorInfo } from "react";', "")
  .replace("export", "")}

ReactDOM.render((
  <ErrorBoundary>
    ${
      bootstrapCodeEntry
        ? "<Bootstrap><Component /></Bootstrap>"
        : "<Component />"
    }
  </ErrorBoundary>),
  document.getElementById("${rootSelector}")
);

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
  onProgress,
  onPublish,
  onReload,
  onSwitchActive,
  onSwitchDeactivate,
  onRouteActive,
  onRouteDeactivate,
}: RenderEntryDeployerContext) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;
  const componentCodeEntry = project.getCodeEntryValue(renderEntry.codeId)!;
  const bundleCodeEntry = {
    id: `bundle-${renderEntry.codeId}`,
    code: await generateBundleCode(project, componentCodeEntry),
    // todo add random string to filename
    filePath: path.join(project.sourceFolderPath, "paintbundle.tsx"),
    codeRevisionId: 0,
  };
  console.log("bundleCode", bundleCodeEntry.code);

  const trimEntry = async (codeEntry: CodeEntry) => ({
    id: codeEntry.id,
    filePath: codeEntry.filePath,
    code:
      (await ltTakeNext(codeEntry.codeWithLookupData$)) ||
      codeEntry.code$.getValue(),
    codeRevisionId: codeEntry.codeRevisionId,
  });
  const codeEntries = await Promise.all(
    project.codeEntries$.getValue().map(trimEntry)
  );
  codeEntries.push(bundleCodeEntry);

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

  let devport: number | null;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    const workerCallback = new Promise<{ result: number | null }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
    progressCallbacks[compileId] = onProgress;

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

    delete compileCallbacks[compileId];
    delete progressCallbacks[compileId];
  } else {
    devport = await webpackRunCode(
      codeEntries,
      bundleCodeEntry,
      config,
      onProgress
    );
  }

  const workerCallbackTime = Date.now();

  frame!.onload = () => {
    console.log("frame onload");
    const errorHandler = (error: Error) => {
      const body = frame!.contentDocument!.querySelector("body")!;
      body.style.margin = "0px";
      body.innerHTML = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error })
      );
      (frame!.contentWindow! as any).paintErrorDisplayed = true;
      return true;
    };
    frame!.contentWindow!.addEventListener("error", (e) =>
      errorHandler(e.error)
    );

    // run the resulting bundle on the provided iframe, with stubs
    (frame!.contentWindow! as any).require = (name: string) => {
      // lm_c76a4fbc3b handle webpack externals
      if (name === "react") return require("react");
      if (name === "react-dom") return require("react-dom");
      if (name === "react-router-dom")
        return getReactRouterProxy(
          frame!.contentWindow!,
          onSwitchActive,
          onSwitchDeactivate,
          onRouteActive,
          onRouteDeactivate
        );
      if (name === "react-refresh/runtime")
        return require("react-refresh/runtime");
      throw new Error(`Unable to require "${name}"`);
    };
    (frame!.contentWindow! as any).exports = {};
    try {
      (frame!.contentWindow! as any).paintBundle();
    } catch (error) {
      errorHandler(error as Error);
    }
    delete (frame!.contentWindow! as any).exports;
    delete (frame!.contentWindow! as any).require;
    onReload();
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
