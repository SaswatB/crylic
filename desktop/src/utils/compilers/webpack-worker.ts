import { WebpackWorkerMessagePayload_Compile } from "../../types/ipc";
import {
  dumpWebpackConfig,
  initialize,
  resetWebpack,
  webpackRunCode,
} from "./run-code-webpack";

const { ipcMain } = __non_webpack_require__("electron");

ipcMain.on("webpack-worker-message", async (e, data) => {
  console.log("wbm", data.action);
  if (data.action === "initialize") {
    initialize(data.nodeModulesPath);
  } else if (data.action === "reset") {
    resetWebpack();
  } else if (data.action === "compile") {
    const { codeEntries, primaryCodeEntry, compileId, config } = data;
    const result = await webpackRunCode(
      codeEntries,
      primaryCodeEntry,
      config,
      ({ percentage, message }) => {
        e.sender.send("webpack-renderer-message", {
          type: "percent-update",
          compileId,
          percentage,
          message,
        });
      },
      (codeEntryId) => {
        e.sender.send("webpack-renderer-message", {
          type: "code-request",
          compileId,
          codeEntryId,
        });
        return new Promise((resolve, reject) =>
          ipcMain.once("webpack-renderer-message-" + codeEntryId, (e, d) =>
            d.action === "code-response" ? resolve(d.code) : reject(d)
          )
        );
      }
    );
    e.sender.send("webpack-renderer-message", {
      type: "compile-finished",
      compileId,
      result,
    });
  }
});

ipcMain.handle(
  "webpack-worker-message-dump-config",
  (e, data: WebpackWorkerMessagePayload_Compile["config"]) =>
    dumpWebpackConfig(data)
);
