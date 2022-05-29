import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";

import { CONFIG_FILE_NAME } from "synergy/src/constants";
import { PackageManager } from "synergy/src/lib/pkgManager/PackageManager";
import { PortablePath } from "synergy/src/lib/project/PortablePath";
import {
  ProjectConfig,
  ProjectConfigFile,
} from "synergy/src/lib/project/ProjectConfig";

import { requireUncached } from "../../utils/utils";
import { InbuiltPackageManager } from "../pkgManager/InbuiltPackageManager";

const fs = __non_webpack_require__("fs") as typeof import("fs");

export class FileProjectConfig extends ProjectConfig {
  public static createProjectConfigFromDirectory(projectPath: PortablePath) {
    let configFile;
    let packageJson;

    // process the config file
    const configFilePath = projectPath.join(CONFIG_FILE_NAME);
    if (fs.existsSync(configFilePath.getNativePath())) {
      // todo use a more secure require/allow async
      configFile = pipe(
        configFilePath.getNativePath(),
        // require the config file
        requireUncached,
        // parse the config file
        ProjectConfigFile.decode,
        fold(
          // log any errors
          (e) => {
            console.log("ProjectConfigFile decode error", e);
            return undefined;
          },
          (config) => config
        )
      );
    }

    // process package.json
    const packageJsonPath = projectPath.join("package.json");
    if (fs.existsSync(packageJsonPath.getNativePath())) {
      packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath.getNativePath(), { encoding: "utf-8" })
      );
    }

    return new FileProjectConfig(projectPath, configFile || {}, packageJson);
  }

  private packageManager: PackageManager | undefined;
  public getPackageManager() {
    if (!this.packageManager) {
      const packageManagerType =
        this.configFile?.packageManager?.type ?? "inbuilt";

      if (packageManagerType.startsWith("inbuilt")) {
        let yarnMode = false;
        if (packageManagerType === "inbuilt-yarn") {
          yarnMode = true;
        } else if (packageManagerType !== "inbuilt-npm") {
          if (
            fs.existsSync(this.projectPath.join("yarn.lock").getNativePath())
          ) {
            yarnMode = true;
          } else {
            try {
              if (this.packageJson.packageManager?.includes("yarn"))
                yarnMode = true;
            } catch (e) {
              // ignore
            }
          }
        }
        this.packageManager = new InbuiltPackageManager(
          this.projectPath,
          yarnMode
        );
      } else if (packageManagerType === "yarn") {
        // yarn
        throw new Error("Not implemented");
      } else {
        // npm
        throw new Error("Not implemented");
      }
    }

    return this.packageManager;
  }
}
