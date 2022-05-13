import { Project } from "../lib/project/Project";
import { ProjectConfig } from "../lib/project/ProjectConfig";
import { RenderStarterDefinition } from "../lib/render-starter";

export abstract class PluginBase {
  protected project: Project | undefined;

  public abstract shouldActivate(project: ProjectConfig): boolean;

  public onInit(project: Project) {
    this.project = project;
  }
  public onClose() {
    this.project = undefined;
  }
  public overrideProjectConfig(
    config: ProjectConfig,
    _context: { fs: typeof import("fs") }
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
