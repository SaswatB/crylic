import { normalizePath } from "synergy/src/lib/normalizePath";

import { WebpackWorkerMessagePayload_Compile } from "../../../types/ipc";
import { requireUncached } from "../../utils";
import { getCraModules } from "../cra-modules";

import baseAppEntry from "!!raw-loader!../../../assets/base-app-entry.html";

const NODE_ENV = "development";
const REACT_APP = /^REACT_APP_/i;

interface WebpackConfigFactoryContext {
  deps: {
    path: typeof import("path");
    fs: typeof import("fs");

    webpack: typeof import("../../../../app/node_modules/webpack");
    HtmlWebpackPlugin: typeof import("html-webpack-plugin");
    ReactRefreshPlugin: typeof import("@pmmmwh/react-refresh-webpack-plugin");
    // @ts-expect-error todo add types
    NodePolyfillPlugin: typeof import("node-polyfill-webpack-plugin");

    dotenv: typeof import("dotenv");
    dotenvExpand: typeof import("dotenv-expand");
    requireFromString: typeof import("require-from-string");
  };
  config: WebpackWorkerMessagePayload_Compile["config"];
  pluginEvalDirectory: string;
}

const getEnvVars = (context: WebpackConfigFactoryContext) => {
  const { path, fs, dotenv, dotenvExpand } = context.deps;
  const { projectFolder } = context.config.paths;

  const dotenvPath = path.resolve(projectFolder, ".env");
  // https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
  const dotenvFiles = [
    `${dotenvPath}.${NODE_ENV}.local`,
    `${dotenvPath}.${NODE_ENV}`,
    `${dotenvPath}.local`,
    dotenvPath,
  ];

  const appEnv: Record<string, string | undefined> = {
    NODE_ENV: `"${NODE_ENV}"`,
    // todo fill in
    PUBLIC_URL: `""`,
    CRYLIC_ENABLED: "true",
  };

  if (!__IS_RENDERER_BUNDLE__) {
    let env: Record<string, string> = { ...(process["env"] as object) };
    dotenvFiles.forEach((dotenvFile) => {
      if (!fs.existsSync(dotenvFile)) return;
      const parsed = dotenv.parse(
        fs.readFileSync(dotenvFile, { encoding: "utf8" })
      );
      Object.entries(parsed).forEach(([key, value]) => {
        if (!(key in env)) env[key] = value;
      });
    });
    env =
      dotenvExpand.expand({ ignoreProcessEnv: true, parsed: env }).parsed ||
      env;

    // copy REACT_APP env vars & .env vars
    Object.keys(env)
      .filter((key) => REACT_APP.test(key) || !(key in process["env"]))
      .forEach((key) => {
        appEnv[key] = JSON.stringify(env[key]);
      });
  }

  return appEnv;
};

// supports ts(x), js(x), css, sass, less and everything else as static files
const getWebpackModules = async (context: WebpackConfigFactoryContext) => {
  const { path } = context.deps;
  const {
    disableWebpackExternals,
    disableReactExternals,
    disableFastRefresh,
    disableSWC,
    enableReactRuntimeCompat,
    paths: { projectFolder },
  } = context.config;

  const fileLoaderOptions = {
    name: "static/media/[name].[hash:8].[ext]",
  };

  console.log("sourcePath", projectFolder);
  let sourceInclude = normalizePath(projectFolder, path.sep);
  if (!sourceInclude.endsWith(path.sep)) {
    sourceInclude += path.sep;
  }

  const swcOptions = {
    // lm_a95a542d63 electron version
    // todo change on publish or support more options
    env: {
      targets: { chrome: "98" },
      include: [
        "proposal-nullish-coalescing-operator",
        "proposal-optional-chaining",
      ],
    },
    sourceMaps: "inline",
    jsc: {
      transform: {
        react: {
          runtime: enableReactRuntimeCompat ? "automatic" : "classic",
          ...(!disableWebpackExternals &&
          !disableReactExternals &&
          enableReactRuntimeCompat
            ? {
                importSource: path.dirname(
                  __non_webpack_require__.resolve("react")
                ),
              }
            : {}),
        },
      },
    },
  };

  const loaders = [
    // embed small images as data urls
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      type: "asset/resource",
    },

    // handle project code (swc)
    !disableSWC && {
      // Include javascript files
      test: /\.(jsx?|mjs)$/,
      exclude: /node_modules/,
      use: {
        loader: "swc-loader",
        options: {
          ...swcOptions,
          jsc: { ...swcOptions.jsc, parser: { jsx: true } },
        },
      },
    },
    !disableSWC && {
      // Include typescript files
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: {
        loader: "swc-loader",
        options: swcOptions,
      },
    },

    // handle project code (babel)
    !!disableSWC && {
      test: /\.(jsx?|tsx?|mjs)$/,
      include: sourceInclude,
      exclude: /node_modules/,
      loader: "babel-loader",
      options: {
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                // lm_a95a542d63 electron version
                // todo change on publish or support more options
                chrome: "98",
              },
            },
          ],
          "@babel/preset-react",
          "@babel/preset-typescript",
        ],
        plugins: [
          "macros",
          ["@babel/proposal-decorators", false],
          "@babel/proposal-class-properties",
          "@babel/proposal-object-rest-spread",
          "@babel/proposal-numeric-separator",
          "@babel/proposal-optional-chaining",
          "@babel/proposal-nullish-coalescing-operator",
          [
            "named-asset-import",
            {
              loaderMap: {
                svg: {
                  ReactComponent: "@svgr/webpack?-svgo,+titleProp,+ref![path]",
                },
              },
            },
          ],
          !disableFastRefresh && [
            "react-refresh/babel",
            { skipEnvCheck: true },
          ],
        ].filter((r) => !!r),
        cacheDirectory: true,
        cacheCompression: false,
        overrides: [
          {
            exclude: /\.tsx?$/,
            plugins: ["@babel/transform-flow-strip-types"],
          },
          {
            test: /\.tsx?$/,
            plugins: [["@babel/proposal-decorators", { legacy: true }]],
          },
        ],
      },
    },

    // handle js outside of project's source directory (babel)
    !!disableSWC && {
      test: /\.m?js$/,
      exclude: /@babel(?:\/|\\{1,2})runtime/,
      loader: "babel-loader",
      options: {
        babelrc: false,
        configFile: false,
        compact: false,
        sourceType: "unambiguous",
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                // lm_a95a542d63 electron version
                // todo change on publish or support more options
                chrome: "98",
              },
              useBuiltIns: "entry",
              modules: false,
              exclude: ["transform-typeof-symbol"],
            },
          ],
        ],
        plugins: [
          [
            "@babel/transform-runtime",
            {
              corejs: false,
              helpers: true,
              // version: require('@babel/runtime/package.json').version,
              regenerator: true,
              useESModules: true,
              // absoluteRuntime: absoluteRuntimePath,
            },
          ],
        ],
        cacheDirectory: true,
        cacheCompression: false,
      },
    },

    // style loaders for css/scss/less
    {
      test: /\.css$/,
      use: ["style-loader", "css-loader"],
    },
    {
      test: /\.(scss|sass)$/,
      use: ["style-loader", "css-loader", "sass-loader"],
    },
    {
      test: /\.less$/,
      use: ["style-loader", "css-loader", "less-loader"],
    },

    // fallback loader for all other assets
    {
      loader: "file-loader",
      exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
      options: fileLoaderOptions,
    },
  ].filter(<T>(l: T | boolean): l is T => !!l);

  return {
    rules: [
      { oneOf: loaders },
      // https://github.com/webpack/webpack/issues/11467
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },
    ],
  };
};

export const webpackConfigFactory = async (
  context: WebpackConfigFactoryContext,
  primaryCodeEntry: WebpackWorkerMessagePayload_Compile["primaryCodeEntry"],
  onProgress: (arg: { percentage: number; message: string }) => void,
  forwardOverrideError?: boolean
): Promise<import("../../../../app/node_modules/webpack").Configuration> => {
  const {
    path,
    fs,
    webpack,
    HtmlWebpackPlugin,
    ReactRefreshPlugin,
    NodePolyfillPlugin,
    requireFromString,
  } = context.deps;
  const {
    paths,
    disableReactExternals,
    disableWebpackExternals,
    disableFastRefresh,
    disablePolyfills,
  } = context.config;
  const env = getEnvVars(context);

  const templateOptions =
    paths.htmlTemplate && fs.existsSync(paths.htmlTemplate)
      ? { template: paths.htmlTemplate }
      : { templateContent: baseAppEntry };

  const projectNodeModules = path.resolve(paths.projectFolder, "node_modules"); // appNodeModules
  const modules = getCraModules({
    ...paths,
    projectSrcFolder: `${paths.projectFolder}/src`,
    projectNodeModules,
  });

  let options: import("../../../../app/node_modules/webpack").Configuration = {
    mode: NODE_ENV,
    entry: primaryCodeEntry.filePath,
    devtool: false,
    performance: false,
    recordsPath: "/static/records.json",
    output: {
      path: "/static",
      filename: "[name].js",
      publicPath: "/",
      // jsonpFunction:
      // devtoolModuleFilenameTemplate:
      chunkFilename: "[name].chunk.js",
      library: "paintbundle",
      libraryTarget: "umd",
      globalObject: "self",
    },
    optimization: {
      // Automatically split vendor and commons
      splitChunks: {
        chunks: "all",
        name: false,
      },
      // Keep the runtime chunk separated to enable long term caching
      runtimeChunk: {
        name: (entrypoint: { name: string }) => `runtime-${entrypoint.name}`,
      },
    },
    module: await getWebpackModules(context),
    resolve: {
      modules: ["node_modules", projectNodeModules].concat(
        modules.additionalModulePaths || []
      ),
      extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
      alias: {
        "react-native": "react-native-web",
        // lm_c76a4fbc3b webpack externals
        ...(!disableWebpackExternals && !disableReactExternals
          ? {
              react: __non_webpack_require__.resolve("react"),
              "react-dom": __non_webpack_require__.resolve("react-dom"),
            }
          : {}),
        ...(!disableWebpackExternals
          ? {
              "react-refresh/runtime": __non_webpack_require__.resolve(
                "react-refresh/runtime"
              ),
            }
          : {}),
        ...(modules.webpackAliases || {}),
      },
      fallback: !disablePolyfills
        ? {
            fs: false,
            tls: false,
            net: false,
            module: false,
            dgram: false,
            dns: false,
            http2: false,
            child_process: false,
          }
        : undefined,
    },
    resolveLoader: {
      modules: ["node_modules", projectNodeModules].concat(
        modules.additionalModulePaths || []
      ),
    },
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      new HtmlWebpackPlugin({
        inject: true,
        ...templateOptions,
      }),
      // InterpolateHtmlPlugin
      // ModuleNotFoundPlugin
      new webpack.DefinePlugin({
        "process.env": env,
        __IS_CRYLIC__: JSON.stringify(true),
      }),
      // WatchMissingNodeModulesPlugin
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      new webpack.ProgressPlugin({
        handler(percentage, message, ...args) {
          onProgress({ percentage, message });
        },
      }),
      !disableFastRefresh && new ReactRefreshPlugin({ forceEnable: true }),
      !disablePolyfills && new NodePolyfillPlugin(),
    ].filter((p) => !!p),
  };

  // handle plugin overrides
  for (const modifier of context.config.pluginEvals.webpack) {
    try {
      const override = requireFromString(
        modifier.code,
        path.join(
          context.pluginEvalDirectory,
          `${modifier.name}-webpack-config-override.js`
        )
      );
      const result = await override(options, webpack);
      if (result) {
        options = result;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // handle a config override specified for this project
  if (paths.overrideWebpackConfig) {
    // todo verify this require returns a function, also maybe run it in a vm are pass an instance of webpack
    const overrideConfig = requireUncached(paths.overrideWebpackConfig);

    if (typeof overrideConfig === "function") {
      try {
        const result = await overrideConfig(options, webpack);
        if (result) {
          options = result;
        }
      } catch (e) {
        if (forwardOverrideError) throw e;
        console.error("webpack override failed", e);
      }
    } else {
      console.error("webpack override is missing");
    }
  }

  return options;
};
