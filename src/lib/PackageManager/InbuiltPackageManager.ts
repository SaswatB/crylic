import path from "path";

import { PackageManager } from "./PackageManager";

const { fork } = __non_webpack_require__(
  "child_process"
) as typeof import("child_process");
const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

let dirname = "";
ipcRenderer.once("runtimeInfo", (e, data) => {
  ({ dirname } = data);
});
ipcRenderer.send("runtimeInfo");

export class InbuiltPackageManager extends PackageManager {
  constructor(path: string, protected yarnMode: boolean) {
    super(path);
  }

  public installPackage(packageName?: string, devDep = false) {
    console.log("starting child process - installPackage", packageName, devDep);
    return fork(
      path.join(dirname, "electron-child.js"),
      ["npm-install", this.path, packageName || "", `${devDep}`],
      { stdio: ["pipe", "pipe", "pipe", "ipc"] }
    );
  }
}
