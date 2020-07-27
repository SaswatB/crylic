import { initialize, webpackRunCode } from "./run-code-webpack";

const { ipcMain } = __non_webpack_require__("electron");

ipcMain.on("webpack-worker-message", async (e, data) => {
  console.log("wbm", data.action);
  if (data.action === "initialize") {
    initialize(data.nodeModulesPath);
  } else if (data.action === "compile") {
    const { codeEntries, selectedCodeId, compileId, paths } = data;
    const result = await webpackRunCode(
      codeEntries,
      selectedCodeId,
      paths,
      ({ percentage, message }) => {
        e.sender.send("webpack-renderer-message", {
          type: "percent-update",
          compileId,
          percentage,
          message,
        });
      }
    );
    e.sender.send("webpack-renderer-message", {
      type: "compile-finished",
      compileId,
      result,
    });
  }
});
