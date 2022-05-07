import { ProjectConfig } from "../../lib/project/ProjectConfig";
import { RenderStarterDefinition } from "../../lib/render-starter";
import { PluginBase } from "../PluginBase";

export class NextPlugin extends PluginBase {
  public shouldActivate(config: ProjectConfig) {
    return config.isNextInstalled();
  }

  public override overrideProjectConfig(
    config: ProjectConfig,
    { fs }: { fs: typeof import("fs") }
  ): ProjectConfig {
    // if a bootstrap file isn't explicitly defined, use Next's default
    if (config.configFile.bootstrap === undefined) {
      const nextBootstrap = ["", "src/"]
        .reduce(
          (acc, dir) => [
            ...acc,
            ...["js", "jsx", "ts", "tsx"].map(
              (ext) => `${dir}pages/_app.${ext}`
            ),
          ],
          [] as string[]
        )
        .find((file) =>
          fs.existsSync(config.projectPath.join(file).getNativePath())
        );
      if (nextBootstrap) {
        config.configFile.bootstrap = nextBootstrap;
      }
    }
    return config;
  }

  public override overrideRenderStarter(def: RenderStarterDefinition) {
    def.imports.push(
      'import { createRouter } from "next/router";',
      'import { RouterContext } from "next/dist/shared/lib/router-context";'
    );
    def.beforeRender.push(
      "window.__NEXT_DATA__ = {};",
      `const router = createRouter('', {}, '', {
        pageLoader: {
          getPageList() {
            return [];
          },
          getMiddlewareList() {
              return [];
          },
          getDataHref({ href }) {
              return href
          },
          _isSsg(route) {
              return false
          },
          loadPage(route) {
              return undefined
          },
          prefetch(route) {
              return undefined
          },
        }
      });`
    );
    def.render.wrappers.unshift({
      open: "RouterContext.Provider value={router}",
      close: "RouterContext.Provider",
    });
    return def;
  }

  public override overrideWebpackConfig() {
    return `
const NormalModule = require("webpack/lib/NormalModule");

// replacement for Next's profiling plugin
class ProfilingPluginStub {
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "ProfilingPluginStub",
      (compilation) => {
        const moduleHooks = NormalModule.getCompilationHooks(compilation);
        moduleHooks.loader.tap("ProfilingPluginStub", (loaderContext) => {
          const span = {
            stop: () => void 0,
            traceChild: () => span,
            manualTraceChild: () => void 0,
            setAttribute: () => void 0,
            traceFn: (fn) => fn(),
            traceAsyncFn: async (fn) => fn(),
          };
          loaderContext.currentTraceSpan = span;
        });
      }
    );
  }
}

/**
 * Webpack override function for Crylic
 * 
 * @param {import('webpack').Configuration} config Webpack config generated by Crylic
 * @param {import('webpack')} webpack Instance of Webpack
 * @returns {import('webpack').Configuration} Modified webpack config
 */
module.exports = function (options, webpack) {
  // override the default image loader
  options.module.rules[0].oneOf.unshift({
    test: /\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$/i,
    loader: "./loaders/next-image-shim-loader",
    issuer: { not: /\\.(css|scss|sass)$/ },
    dependency: { not: ["url"] },
  });
  options.plugins.push(new ProfilingPluginStub());
  return options
};
`.trim();
  }

  public override overrideWebpackDevServer() {
    return `
/**
 * Webpack dev server override function for Crylic
 * 
 * @param {import('webpack-dev-server')} devServer Instance of Webpack Dev Server, before '.listen' is called
 */
module.exports = function (devServer) {
  const devServerSetupApp = devServer["setupApp"].bind(devServer);
  devServer["setupApp"] = () => {
    devServerSetupApp();
    // todo support a configurable /_next route
    devServer.app?.get("/_next/image", (req, res) => {
      res.redirect(req.query.url);
    });
  };
};
`.trim();
  }
}
