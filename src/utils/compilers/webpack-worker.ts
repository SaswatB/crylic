import { initialize, webpackRunCode } from "./run-code-webpack";
declare var self: ServiceWorkerGlobalScope;

self.addEventListener(
  "message",
  async (e) => {
    console.log("wbm", e.data);
    if (e.data.action === "initialize") {
      initialize(e.data.nodeModulesPath);
    } else if (e.data.action === "compile") {
      const {
        codeEntries,
        selectedCodeId,
        compileId,
        overrideConfigPath,
      } = e.data;
      const bundle = await webpackRunCode(
        codeEntries,
        selectedCodeId,
        overrideConfigPath,
        ({ percentage, message }) => {
          postMessage({
            type: "percent-update",
            compileId,
            percentage,
            message,
          });
        }
      );
      postMessage({ type: "compile-finished", compileId, bundle });
    }
  },
  false
);
