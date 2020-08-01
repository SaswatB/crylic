import path from "path";

const dirPath = __non_webpack_require__
  .resolve("webpack")
  .replace(/node_modules[/\\].*$/, "");
const sentryPath = path.join(
  dirPath,
  process.env.NODE_ENV === "development"
    ? "public/sentry.js"
    : "build/sentry.js"
);

// init sentry on the main process
__non_webpack_require__(sentryPath);

const windowStateKeeper = __non_webpack_require__("electron-window-state");
const { app, BrowserWindow } = __non_webpack_require__("electron");

app.allowRendererProcessReuse = false;
app.commandLine.appendSwitch(
  "disable-features",
  "OutOfBlinkCors,IsolateOrigins,site-per-process,CrossSiteDocumentBlockingAlways,CrossSiteDocumentBlockingIfIsolating"
);
app.commandLine.appendSwitch("disable-site-isolation-trials");
// const {
//   default: installExtension,
//   REACT_DEVELOPER_TOOLS,
// } = require("electron-devtools-installer");

function createWindow() {
  // Load the previous state with fallback to defaults
  let mainWindowState = windowStateKeeper({
    defaultWidth: 800,
    defaultHeight: 600,
  });

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    webPreferences: {
      // init sentry on the renderer processes
      preload: sentryPath,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      // nodeIntegrationInSubFrames: true,
      enableRemoteModule: true,
      webSecurity: false,
    },
  });

  // Let us register listeners on the window, so we can update the state
  // automatically (the listeners will be removed when the window is closed)
  // and restore the maximized or full screen state
  mainWindowState.manage(mainWindow);

  // hide the application menu
  mainWindow.setMenuBarVisibility(false);

  // load the url of the app.
  mainWindow.loadURL(
    process.env.NODE_ENV === "development"
      ? "http://localhost:4000"
      : `file://${path.join(dirPath, "build/index.html")}`
  );

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // installExtension(REACT_DEVELOPER_TOOLS)
  //   .then((name) => {
  //     console.log(`Added Extension:  ${name}`);
  createWindow();
  // })
  // .catch((err) => console.log("An error occurred: ", err));
});

// Quit when all windows are closed.
app.on("window-all-closed", function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// start up the webpack worker
// eslint-disable-next-line import/first
import "./utils/compilers/webpack-worker";