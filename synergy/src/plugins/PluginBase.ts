import { Project } from "../lib/project/Project";
import { ProjectConfig } from "../lib/project/ProjectConfig";

export abstract class PluginBase {
  public abstract shouldActivate(project: ProjectConfig): boolean;

  public onInit(project: Project) {}
  public onClose() {}
  public overrideConfig(
    config: ProjectConfig,
    context: { fs: typeof import("fs"); path: typeof import("path") }
  ) {
    return config;
  }
}
