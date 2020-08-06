import React from "react";
import ReactDOMServer from "react-dom/server";

import { ErrorBoundary } from "../../components/ErrorBoundary";
import { Project } from "../../lib/project/Project";
import { CodeEntry, RenderEntry } from "../../types/paint";
import { DEFAULT_HTML_TEMPLATE_SELECTOR } from "../constants";
import { publishComponent, unpublishComponent } from "../publish-component";
import { getReactRouterProxy, RouteDefinition } from "../react-router-proxy";
import { webpackRunCode } from "./run-code-webpack";

import errorBoundaryComponent from "!!raw-loader!../../components/ErrorBoundary";

const path = __non_webpack_require__("path") as typeof import("path");

const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

const WORKER_ENABLED = true;

const progressCallbacks: Record<number, Function> = {};
const compileCallbacks: Record<number, Function> = {};
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
    nodeModulesPath: __non_webpack_require__
      .resolve("webpack")
      .replace(
        /node_modules[/\\].*$/,
        `${
          process.env.NODE_ENV === "development" ? `app${path.sep}` : ""
        }node_modules${path.sep}`
      ),
  });
}

let compileIdCounter = 0;

interface RunnerContext {
  frame: HTMLIFrameElement | undefined;
  onProgress: (arg: { percentage: number; message: string }) => void;
  onPublish: (url: string) => void;
  onReload: () => void;

  // react router support
  onSwitchActive: (switchId: string, arg: RouteDefinition) => void;
  onSwitchDeactivate: (switchId: string) => void;
  onRouteActive: (routeId: string, route: string) => void;
  onRouteDeactivate: (routeId: string) => void;
}

/**
 * Runs `webpackRunCode` on a worker
 */
export const webpackRunCodeWithWorker = async (
  project: Project,
  renderEntry: RenderEntry,
  {
    frame,
    onProgress,
    onPublish,
    onReload,
    onSwitchActive,
    onSwitchDeactivate,
    onRouteActive,
    onRouteDeactivate,
  }: RunnerContext
) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;

  const getImport = (declaration: string, source: string) =>
    `import ${declaration} from "${source.replace(/\\/g, "\\\\")}";`;
  const getImportFromCodeEntry = (local: string, codeEntry: CodeEntry) =>
    getImport(
      codeEntry.exportIsDefault || !codeEntry.exportName
        ? local
        : codeEntry.exportName === local
        ? `{ ${local} }`
        : `{ ${codeEntry.exportName} as ${local} }`,
      codeEntry.filePath
    );
  const componentImport = getImportFromCodeEntry(
    "Component",
    project.getCodeEntry(renderEntry.codeId)!
  );
  const bootstrapCodeEntry = project.codeEntries.find((c) => c.isBootstrap);
  const bootstrapImport = bootstrapCodeEntry
    ? getImportFromCodeEntry("Bootstrap", bootstrapCodeEntry)
    : "";

  const bundleCode = `
import React, { ErrorInfo } from "react";
import ReactDOM from "react-dom";
${componentImport}
${bootstrapImport}

${errorBoundaryComponent
  .replace('import React, { ErrorInfo } from "react";', "")
  .replace("export", "")}

ReactDOM.render((
  <ErrorBoundary>
    ${bootstrapCodeEntry ? `<Bootstrap><Component /></Bootstrap>` : `<App />`}
  </ErrorBoundary>),
  document.getElementById("${
    project.config.configFile?.htmlTemplate?.rootSelector ||
    DEFAULT_HTML_TEMPLATE_SELECTOR
  }")
);
`;
  console.log("bundleCode", bundleCode);

  const bundleId = `bundle-${renderEntry.codeId}`;
  const codeEntries = project.codeEntries
    .map((codeEntry) => ({
      id: codeEntry.id,
      filePath: codeEntry.filePath,
      code: codeEntry.codeWithLookupData || codeEntry.code,
      codeRevisionId: codeEntry.codeRevisionId,
    }))
    .concat([
      {
        id: bundleId,
        code: bundleCode,
        // todo add random string to filename
        filePath: path.join(project.sourceFolderPath, "paintbundle.tsx"),
        codeRevisionId: 0,
      },
    ]);

  const paths = {
    projectFolder: project.path,
    projectSrcFolder: project.sourceFolderPath,
    overrideWebpackConfig: project.config.getFullOverrideWebpackPath(),
    htmlTemplate: project.config.getFullHtmlTemplatePath(),
  };

  let devport;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    const workerCallback = new Promise<{ result: number }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
    progressCallbacks[compileId] = onProgress;

    // set a message to the worker for compiling code
    ipcRenderer.send("webpack-worker-message", {
      action: "compile",
      codeEntries,
      selectedCodeId: bundleId,
      compileId,
      paths,
    });

    // wait for the worker to compile
    ({ result: devport } = await workerCallback!);

    delete compileCallbacks[compileId];
    delete progressCallbacks[compileId];
  } else {
    devport = await webpackRunCode(codeEntries, bundleId, paths, onProgress);
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

    // run the resuulting bundle on the provided iframe, with stubs
    (frame!.contentWindow! as any).require = (name: string) => {
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
      errorHandler(error);
    }
    delete (frame!.contentWindow! as any).exports;
    delete (frame!.contentWindow! as any).require;
    onReload();
  };
  if (
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
