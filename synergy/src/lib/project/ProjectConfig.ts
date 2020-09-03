import * as it from "io-ts";
import path from "path";

import {
  DEFAULT_PROJECT_HTML_TEMPLATE_PATH,
  DEFAULT_PROJECT_SOURCE_FOLDER,
} from "../../constants";
import { PackageJson } from "../../types/paint";
import { PackageManager } from "../packageManager/PackageManager";

export const ProjectConfigFile = it.type({
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
  packageManager: it.union([
    it.type({
      type: it.union([it.string, it.undefined]), // inbuilt, inbuild-npm, inbuild-yarn, npm or yarn
    }),
    it.undefined,
  ]),
});
export type ProjectConfigFile = it.TypeOf<typeof ProjectConfigFile>;

export abstract class ProjectConfig {
  protected constructor(
    public readonly projectPath: string,
    public readonly configFile: ProjectConfigFile | undefined,
    public readonly packageJson: PackageJson | undefined
  ) {}

  get name() {
    return path.basename(this.projectPath.replace(/\\/g, "/"));
  }

  public isPackageInstalled(module: string, allowDevDep = true) {
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

  public abstract getPackageManager(): PackageManager;

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