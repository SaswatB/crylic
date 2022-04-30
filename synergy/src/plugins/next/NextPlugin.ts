import { normalizePath } from "../../lib/normalizePath";
import { ProjectConfig } from "../../lib/project/ProjectConfig";
import { PluginBase } from "../PluginBase";

export class NextPlugin extends PluginBase {
  public shouldActivate(config: ProjectConfig) {
    return config.isNextInstalled();
  }

  public override overrideConfig(config: ProjectConfig, { fs, path }: { fs: typeof import('fs'), path: typeof import('path')}): ProjectConfig {
    // if a bootstrap file isn't explicitly defined, use Next's default
    if (config.configFile.bootstrap === undefined) {
      const nextBootstrap = ['', 'src/'].reduce((acc, dir) => [...acc, ...['js', 'jsx', 'ts', 'tsx'].map(ext => `${dir}pages/_app.${ext}`)], [] as string[]).find(file =>
        fs.existsSync(path.join(config.projectPath, normalizePath(file, path.sep))));
      if (nextBootstrap) {
        config.configFile.bootstrap = nextBootstrap;
      }
    }
    return config
  }
}
