// initialize store for renderer
__non_webpack_require__("electron-store").initRenderer();
// init sentry on the main process
require("./sentry");

const path = __non_webpack_require__("path") as typeof import("path");
const dirPath = __non_webpack_require__
  .resolve("webpack")
  .replace(/node_modules[/\\].*$/, "");

const windowStateKeeper = __non_webpack_require__("electron-window-state");
const { app, ipcMain, BrowserWindow, dialog } =
  __non_webpack_require__("electron");

app.commandLine.appendSwitch(
  "disable-features",
  "OutOfBlinkCors,IsolateOrigins,site-per-process,CrossSiteDocumentBlockingAlways,CrossSiteDocumentBlockingIfIsolating"
);
app.commandLine.appendSwitch("enable-blink-features", "ResizeObserverUpdates"); // enables borderBoxSize on ResizeObserver
app.commandLine.appendSwitch("disable-site-isolation-trials");

async function createWindow() {
  // Load the previous state with fallback to defaults
  let mainWindowState = windowStateKeeper({
    defaultWidth: 1200,
    defaultHeight: 700,
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    icon: path.join(__dirname, "/icon.ico"),
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      // nodeIntegrationInSubFrames: true,
      webSecurity: false,
      devTools: true,
      additionalArguments: [`--appPath=${app.getAppPath()}`],
    },
  });

  // register a close confirmation dialog
  mainWindow.on("close", function (e) {
    const response = dialog.showMessageBoxSync(mainWindow, {
      type: "question",
      buttons: ["Yes", "No"],
      title: "Confirm",
      message: "Are you sure you want to quit? Any unsaved data will be lost.",
    });
    if (response === 1) e.preventDefault();
  });

  // Let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  mainWindowState.manage(mainWindow);

  // hide the application menu
  mainWindow.setMenuBarVisibility(false);

  // load the url of the app.
  await mainWindow.loadURL(
    !__IS_PRODUCTION__
      ? "http://localhost:12000"
      : `file://${path.join(dirPath, "build/index.html")}`
  );
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => createWindow())
  .catch(console.error);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
    process.exit(0);
  }
});

app.on("activate", function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0)
    createWindow().catch(console.error);
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// call for the renderer to get the main process's dirname/execPath
ipcMain.handle("runtimeInfo", () => ({
  dirname: __dirname,
  execPath: process.execPath,
}));

ipcMain.handle("showOpenDialog", (_e, options) =>
  dialog.showOpenDialog(options)
);

ipcMain.handle("showSaveDialog", (_e, options) =>
  dialog.showSaveDialog(options)
);

ipcMain.handle("getAppPath", (_e, type) => app.getPath(type));

// start up the webpack worker
// eslint-disable-next-line import/first
import "./utils/compilers/webpack-worker";
