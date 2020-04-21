// eslint-disable-next-line import/no-webpack-loader-syntax
import WebpackWorker from "worker-loader!./webpack-worker";

import { CodeEntry } from "../../types/paint";

const path = __non_webpack_require__("path") as typeof import("path");

// start the worker
const worker = new WebpackWorker();
const compileCallbacks: Record<number, Function> = {};
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

let compileIdCounter = 0;

/**
 * Runs `webpackRunCode` on a worker
 */
export const webpackRunCodeWithWorker = async (
  codeEntries: CodeEntry[],
  selectedCodeId: string,
  codeTransformer: (codeEntry: CodeEntry) => string,
  { window }: any
) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;

  // register a callback for then the worker completes
  const workerCallback = new Promise<{ bundle: string }>((resolve) => {
    compileCallbacks[compileId] = resolve;
  });
  // set a message to the worker for compiling code
  worker.postMessage({
    action: "compile",
    codeEntries: codeEntries.map((codeEntry) => ({
      ...codeEntry,
      code: codeTransformer(codeEntry),
    })),
    selectedCodeId,
    compileId,
  });

  // wait for the worker to compile
  const { bundle } = await workerCallback;

  const workerCallbackTime = Date.now();

  // run the resuulting bundle on the provided iframe, with stubs
  let moduleExports: any = {};
  let exports: any = {};
  window.require = (name: string) => {
    if (name === "react") return require("react");
    if (name === "react-dom") return require("react-dom");
    return __non_webpack_require__(name);
    // throw new Error(`Unable to require "${name}"`)
  };
  window.module = moduleExports;
  window.exports = exports;
  window.eval(bundle);

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