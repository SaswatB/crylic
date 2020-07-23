import WebpackWorker from "worker-loader!./webpack-worker";

import { Project } from "../../lib/project/Project";
import { RenderEntry } from "../../types/paint";
import { publishComponent, unpublishComponent } from "../publish-component";
import { getReactRouterProxy, RouteDefinition } from "../react-router-proxy";
import { webpackRunCode } from "./run-code-webpack";

const path = __non_webpack_require__("path") as typeof import("path");

const WORKER_ENABLED = true;

let worker: WebpackWorker;
const progressCallbacks: Record<number, Function> = {};
const compileCallbacks: Record<number, Function> = {};
if (WORKER_ENABLED) {
  // start the worker
  console.log("starting webpack worker");
  worker = new WebpackWorker();
  worker.onmessage = (e) => {
    switch (e.data.type) {
      case "percent-update":
        progressCallbacks[e.data.compileId]?.(e.data);
        break;
      case "compile-finished":
        compileCallbacks[e.data.compileId]?.(e.data);
        break;
    }
  };
  // initialize the worker with the local node modules
  worker.postMessage({
    action: "initialize",
    nodeModulesPath: __non_webpack_require__
      .resolve("webpack")
      .replace(/node_modules[/\\].*$/, `node_modules${path.sep}`),
  });
}

let compileIdCounter = 0;

interface RunnerContext {
  window: Window & any;
  onProgress: (arg: { percentage: number; message: string }) => void;
  onPublish: (url: string) => void;

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
    window,
    onProgress,
    onPublish,
    onSwitchActive,
    onSwitchDeactivate,
    onRouteActive,
    onRouteDeactivate,
  }: RunnerContext
) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;

  const bundleCode = `
  export const component = require("${
    project.getCodeEntry(renderEntry.codeId)!.filePath
  }")
  ${
    project.config?.configFile?.bootstrap
      ? `export const bootstrap = require("${path.join(
          project.path,
          project.config.configFile?.bootstrap
        )}");`
      : ""
  }
  `.replace(/\\/g, "\\\\");

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
        filePath: "/index.js",
        codeRevisionId: 0,
      },
    ]);

  const paths = {
    projectFolder: project.path,
    projectSrcFolder: project.sourceFolderPath,
    overrideWebpackConfig: project.config.getFullOverrideWebpackPath(),
  };

  let bundle;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    const workerCallback = new Promise<{ bundle: string }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
    progressCallbacks[compileId] = onProgress;

    // set a message to the worker for compiling code
    worker.postMessage({
      action: "compile",
      codeEntries,
      selectedCodeId: bundleId,
      compileId,
      paths,
    });

    // wait for the worker to compile
    ({ bundle } = await workerCallback!);

    delete compileCallbacks[compileId];
    delete progressCallbacks[compileId];
  } else {
    bundle = await webpackRunCode(codeEntries, bundleId, paths, onProgress);
  }

  const workerCallbackTime = Date.now();

  // run the resuulting bundle on the provided iframe, with stubs
  let moduleExports: any = {};
  let exports: any = {};
  window.require = (name: string) => {
    if (name === "react") return require("react");
    if (name === "react-dom") return require("react-dom");
    if (name === "react-router-dom")
      return getReactRouterProxy(
        renderEntry.route,
        onSwitchActive,
        onSwitchDeactivate,
        onRouteActive,
        onRouteDeactivate
      );
    if (name === "react-refresh/runtime")
      return require("react-refresh/runtime");
    // normalize is injected into all frames by default, todo use this to override any setting that turns normalize off
    if (name === "normalize.css") return {};
    throw new Error(`Unable to require "${name}"`);
  };
  window.module = moduleExports;
  window.exports = exports;
  try {
    window.eval(bundle);
  } catch (error) {
    __non_webpack_require__("fs").writeFileSync("./bundle.js", bundle);
    throw error;
  }
  if (renderEntry.publish) {
    const url = await publishComponent(renderEntry.codeId, bundle!);
    console.log("published:", url);
    onPublish(url);
  } else {
    unpublishComponent(renderEntry.codeId);
  }

  const endCallbackTime = Date.now();

  console.log(
    "webpackRunCodeWithWorker times",
    endCallbackTime - startTime,
    endCallbackTime - workerCallbackTime,
    workerCallbackTime - startTime
  );

  // return the results of the bundle evalution on the iframe
  return moduleExports.exports || exports;
};
