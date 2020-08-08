import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as it from "io-ts";
import path from "path";

import { PackageJson } from "../../types/paint";
import {
  CONFIG_FILE_NAME,
  DEFAULT_PROJECT_HTML_TEMPLATE_PATH,
  DEFAULT_PROJECT_SOURCE_FOLDER,
} from "../../utils/constants";

const fs = __non_webpack_require__("fs") as typeof import("fs");

function requireUncached(module: string) {
  delete __non_webpack_require__.cache[__non_webpack_require__.resolve(module)];
  return __non_webpack_require__(module);
}

const ProjectConfigFile = it.type({
  bootstrap: it.union([it.string, it.undefined]),
  sourceFolder: it.union([it.string, it.undefined]),
  overrideWebpack: it.union([
    it.type({
      path: it.string,
    }),
    it.undefined,
  ]),
  prettier: it.union([
    it.type({
      enabled: it.boolean,
      config: it.union([it.string, it.undefined]),
    }),
    it.undefined,
  ]),
  htmlTemplate: it.union([
    it.type({
      path: it.string,
      rootSelector: it.union([it.string, it.undefined]),
    }),
    it.undefined,
  ]),
  analyzer: it.union([
    it.type({
      allowLowerCaseComponentFiles: it.union([it.boolean, it.undefined]),
      allowTestComponentFiles: it.union([it.boolean, it.undefined]),
      allowDeclarationComponentFiles: it.union([it.boolean, it.undefined]),
      disableComponentExportsGuard: it.union([it.boolean, it.undefined]),
      forceUseComponentDefaultExports: it.union([it.boolean, it.undefined]),
    }),
    it.undefined,
  ]),
});
export type ProjectConfigFile = it.TypeOf<typeof ProjectConfigFile>;

export class ProjectConfig {
  protected constructor(
    public readonly projectPath: string,
    public readonly configFile: ProjectConfigFile | undefined,
    public readonly packageJson: PackageJson | undefined
  ) {}

  public static async createProjectConfigFromDirectory(projectPath: string) {
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

    return new ProjectConfig(projectPath, configFile, packageJson);
  }

  private isPackageInstalled(module: string, allowDevDep = true) {
    return (
      module in (this.packageJson?.dependencies || {}) ||
      (allowDevDep && module in (this.packageJson?.devDependencies || {}))
    );
  }
  public isPrettierInstalled = () => this.isPackageInstalled("prettier");
  public isPrettierEnabled() {
    return this.configFile?.prettier?.enabled ?? this.isPrettierInstalled();
  }
  public isReactInstalled = () => this.isPackageInstalled("react");
  public isVueInstalled = () => this.isPackageInstalled("vue");

  public getFullSourceFolderPath() {
    return path.join(
      this.projectPath,
      this.configFile?.sourceFolder || DEFAULT_PROJECT_SOURCE_FOLDER
    );
  }
  public getFullOverrideWebpackPath() {
    return this.configFile?.overrideWebpack?.path
      ? path.join(this.projectPath, this.configFile.overrideWebpack.path)
      : undefined;
  }
  public getFullHtmlTemplatePath() {
    return path.join(
      this.projectPath,
      this.configFile?.htmlTemplate?.path || DEFAULT_PROJECT_HTML_TEMPLATE_PATH
    );
  }
}
