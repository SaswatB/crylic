import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import path from "path";

import {
  ProjectConfig,
  ProjectConfigFile,
} from "synergy/src/lib/project/ProjectConfig";

import { CONFIG_FILE_NAME } from "../../utils/constants";
import { requireUncached } from "../../utils/utils";
import { InbuiltPackageManager } from "../packageManager/InbuiltPackageManager";

const fs = __non_webpack_require__("fs") as typeof import("fs");

export class FileProjectConfig extends ProjectConfig {
  public static createProjectConfigFromDirectory(projectPath: string) {
    let configFile;
    let packageJson;

    // process the config file
    const configFilePath = path.join(projectPath, CONFIG_FILE_NAME);
    if (fs.existsSync(configFilePath)) {
      // todo use a more secure require/allow async
      configFile = pipe(
        configFilePath,
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
    const packageJsonPath = path.join(projectPath, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, { encoding: "utf-8" })
      );
    }

    return new FileProjectConfig(projectPath, configFile, packageJson);
  }

  public getPackageManager() {
    const packageManagerType =
      this.configFile?.packageManager?.type ?? "inbuilt";

    if (packageManagerType.startsWith("inbuilt")) {
      return new InbuiltPackageManager(
        this.projectPath,
        packageManagerType === "inbuilt-yarn" ||
          (packageManagerType !== "inbuilt-npm" &&
            fs.existsSync(path.join(this.projectPath, "yarn.lock")))
      );
    } else if (packageManagerType === "yarn") {
      // yarn
      throw new Error("Not implemented");
    }
    // npm
    throw new Error("Not implemented");
  }
}
