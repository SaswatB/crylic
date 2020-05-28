import WebpackWorker from "worker-loader!./webpack-worker";

import { RenderEntry } from "../../types/paint";
import { Project } from "../Project";
import { getReactRouterProxy, RouteDefinition } from "../react-router-proxy";
import { webpackRunCode } from "./run-code-webpack";

const path = __non_webpack_require__("path") as typeof import("path");

const WORKER_ENABLED = true;

let worker: WebpackWorker;
const compileCallbacks: Record<number, Function> = {};
if (WORKER_ENABLED) {
  // start the worker
  worker = new WebpackWorker();
  worker.onmessage = (e) => {
    compileCallbacks[e.data.compileId]?.(e.data);
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

  // react router support
  onRoutesDefined: (arg: RouteDefinition) => void;
  onRouteChange: (route: string) => void;
}

/**
 * Runs `webpackRunCode` on a worker
 */
export const webpackRunCodeWithWorker = async (
  project: Project,
  renderEntry: RenderEntry,
  { window, onRoutesDefined, onRouteChange }: RunnerContext
) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;

  let workerCallback: Promise<{ bundle: string }>;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    workerCallback = new Promise<{ bundle: string }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
  }

  const bundleCode = `
  export const component = require("${
    project.codeEntries.find(({ id }) => id === renderEntry.codeId)!.filePath
  }")
  ${
    project.config?.bootstrap
      ? `export const bootstrap = require("${path.join(
          project.path,
          project.config.bootstrap
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
    }))
    .concat([
      {
        id: bundleId,
        code: bundleCode,
        filePath: "/index.tsx",
      },
    ]);
  let bundle;
  if (WORKER_ENABLED) {
    // set a message to the worker for compiling code
    worker.postMessage({
      action: "compile",
      codeEntries,
      selectedCodeId: bundleId,
      compileId,
    });

    // wait for the worker to compile
    ({ bundle } = await workerCallback!);
  } else {
    bundle = await webpackRunCode(codeEntries, bundleId);
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
        onRoutesDefined,
        onRouteChange
      );
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
