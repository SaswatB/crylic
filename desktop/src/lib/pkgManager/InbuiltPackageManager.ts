import { PackageManager } from "synergy/src/lib/pkgManager/PackageManager";
import { PortablePath } from "synergy/src/lib/project/PortablePath";

import { FilePortablePath } from "../project/FilePortablePath";

const { fork } = __non_webpack_require__(
  "child_process"
) as typeof import("child_process");
const fs = __non_webpack_require__("fs") as typeof import("fs");
const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

const Store = __non_webpack_require__(
  "electron-store"
) as typeof import("electron-store");
const store = new Store();

let dirname: PortablePath;
ipcRenderer
  .invoke("runtimeInfo")
  .then((data) => (dirname = new FilePortablePath(data.dirname)))
  .catch(console.error);

export class InbuiltPackageManager extends PackageManager {
  constructor(path: PortablePath, protected yarnMode: boolean) {
    super(path);
  }

  public installPackage(packageName?: string, devDep = false) {
    // todo support multiple npm versions
    console.log("starting child process - installPackage", packageName, devDep);
    return fork(
      dirname.join("electron-child.js").getNativePath(),
      [
        this.yarnMode ? "yarn-install" : "npm-install",
        this.path.getNativePath(),
        packageName || "",
        `${devDep}`,
      ],
      {
        stdio: ["pipe", "pipe", "pipe", "ipc"],
        env: {
          ...process.env,
          DISABLE_TRACKING: `${!!store.get("tracking_disabled")}`,
        },
      }
    );
  }

  public hasDepsInstalled() {
    // todo support node_modules in a higher directory
    return fs.existsSync(this.path.join("node_modules").getNativePath());
  }
}
