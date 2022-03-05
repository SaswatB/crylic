import path from "path";

import { PackageManager } from "synergy/src/lib/packageManager/PackageManager";

const { fork } = __non_webpack_require__(
  "child_process"
) as typeof import("child_process");
const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

let dirname = "";
ipcRenderer.invoke("runtimeInfo").then((data) => ({ dirname } = data));

export class InbuiltPackageManager extends PackageManager {
  constructor(path: string, protected yarnMode: boolean) {
    super(path);
  }

  public installPackage(packageName?: string, devDep = false) {
    // todo support multiple npm versions
    console.log("starting child process - installPackage", packageName, devDep);
    return fork(
      path.join(dirname, "electron-child.js"),
      ["npm-install", this.path, packageName || "", `${devDep}`],
      { stdio: ["pipe", "pipe", "pipe", "ipc"] }
    );
  }
}
