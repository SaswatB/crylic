import * as it from "io-ts";
import path from "path";
import semver from "semver";

import {
  DEFAULT_HTML_TEMPLATE_SELECTOR,
  DEFAULT_PROJECT_HTML_TEMPLATE_PATH,
  DEFAULT_PROJECT_SOURCE_FOLDER,
} from "../../constants";
import { PackageJson } from "../../types/paint";
import { PackageManager } from "../pkgManager/PackageManager";

export const ProjectConfigFile = it.type({
  bootstrap: it.union([it.string, it.undefined]),
  sourceFolder: it.union([it.string, it.undefined]),
  webpack: it.union([
    it.type({
      overrideConfig: it.union([
        it.type({
          // lm_86a5543abc used in an in-app example
          path: it.union([it.string, it.undefined]),
          disableExternalsInjection: it.union([it.boolean, it.undefined]),
          disableFastRefresh: it.union([it.boolean, it.undefined]),
          disableSWC: it.union([it.boolean, it.undefined]),
        }),
        it.undefined,
      ]),
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
      maxFileSizeBytes: it.union([it.number, it.undefined]),
    }),
    it.undefined,
  ]),
  packageManager: it.union([
    it.type({
      type: it.union([
        it.literal("inbuilt"),
        it.literal("inbuilt-npm"),
        it.literal("inbuilt-yarn"),
        it.literal("npm"),
        it.literal("yarn"),
        it.undefined,
      ]),
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

  public getAllPackages() {
    return [
      ...Object.entries(this.packageJson?.dependencies || {}).map(
        ([key, value]) => ({
          name: key,
          version: value,
          dev: false,
        })
      ),
      ...Object.entries(this.packageJson?.devDependencies || {}).map(
        ([key, value]) => ({
          name: key,
          version: value,
          dev: true,
        })
      ),
    ];
  }

  public getPackageVersion(
    module: string,
    allowDevDep = true
  ): string | undefined {
    if (module in (this.packageJson?.dependencies || {}))
      return this.packageJson.dependencies[module];
    if (allowDevDep && module in (this.packageJson?.devDependencies || {}))
      return this.packageJson.devDependencies[module];

    return undefined;
  }

  public isPackageInstalled(module: string, allowDevDep = true) {
    return this.getPackageVersion(module, allowDevDep) !== undefined;
  }
  public isPrettierInstalled = () => this.isPackageInstalled("prettier");
  public isPrettierEnabled() {
    return this.configFile?.prettier?.enabled ?? this.isPrettierInstalled();
  }
  public isReactInstalled = () => this.isPackageInstalled("react");
  public isReactOverV17 = () => {
    const v = this.getPackageVersion("react");
    const mv = v && semver.minVersion(v);
    return !!mv && semver.gte(mv, "17.0.0");
  };
  public isVueInstalled = () => this.isPackageInstalled("vue");

  public abstract getPackageManager(): PackageManager;

  public getFullSourceFolderPath() {
    return path.join(
      this.projectPath.replace(/\\/g, "/"),
      this.configFile?.sourceFolder?.replace(/\\/g, "/") ||
        DEFAULT_PROJECT_SOURCE_FOLDER
    );
  }
  public getFullOverrideWebpackPath() {
    const webpackPath = this.configFile?.webpack?.overrideConfig?.path;
    return webpackPath ? path.join(this.projectPath, webpackPath) : undefined;
  }
  public getFullHtmlTemplatePath() {
    return path.join(
      this.projectPath,
      this.configFile?.htmlTemplate?.path || DEFAULT_PROJECT_HTML_TEMPLATE_PATH
    );
  }
  public getHtmlTemplateSelector() {
    return (
      this.configFile?.htmlTemplate?.rootSelector ||
      DEFAULT_HTML_TEMPLATE_SELECTOR
    );
  }

  public getAnalyzerMaxFileSizeBytes() {
    return this.configFile?.analyzer?.maxFileSizeBytes ?? 50 * 1024;
  }
}
