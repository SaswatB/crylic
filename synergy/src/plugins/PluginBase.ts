import { Project } from "../lib/project/Project";
import { ProjectConfig } from "../lib/project/ProjectConfig";
import { RenderStarterDefinition } from "../lib/render-starter";

export abstract class PluginBase {
  public abstract shouldActivate(project: ProjectConfig): boolean;

  public onInit(_project: Project) {}
  public onClose() {}
  public overrideProjectConfig(
    config: ProjectConfig,
    _context: { fs: typeof import("fs"); path: typeof import("path") }
  ) {
    return config;
  }
  public overrideRenderStarter(def: RenderStarterDefinition) {
    return def;
  }
  public overrideWebpackConfig(): string | undefined {
    return undefined;
  }
  public overrideWebpackDevServer(): string | undefined {
    return undefined;
  }
}
