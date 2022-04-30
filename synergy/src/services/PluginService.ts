import { singleton } from "tsyringe";

import { ProjectConfig } from "../lib/project/ProjectConfig";
import { inbuiltPlugins } from "../plugins";
import { PluginBase } from "../plugins/PluginBase";

@singleton()
export class PluginService {
  public readonly plugins: PluginBase[] = inbuiltPlugins.map((P) => new P());
  private activePlugins: PluginBase[] = [];

  public activatePlugins(config: ProjectConfig) {
    this.activePlugins = this.plugins.filter((p) => p.shouldActivate(config));
  }
  public deactivatePlugins() {
    this.activePlugins = [];
  }

  public forEachActive(apply: (plugin: PluginBase) => void) {
    this.activePlugins.forEach(apply);
  }
  public reduceActive<U>(
    apply: (
      previousValue: U,
      plugin: PluginBase,
      currentIndex: number,
      array: PluginBase[]
    ) => U,
    initialValue: U
  ): U {
    return this.activePlugins.reduce(apply, initialValue);
  }
}
