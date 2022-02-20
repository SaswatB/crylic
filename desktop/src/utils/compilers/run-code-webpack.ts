// import getCSSModuleLocalIdent from "react-dev-utils/getCSSModuleLocalIdent";
import { cloneDeep } from "lodash";
import { AddressInfo } from "net";

import { WebpackWorkerMessagePayload_Compile } from "../../types/ipc";
import { normalizePath } from "../normalizePath";
import { getAppNodeModules, requireUncached } from "../utils";
import { getCraModules } from "./cra-modules";

import baseAppEntry from "!!raw-loader!../../assets/base-app-entry.html";

type IFs = import("memfs").IFs;

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");
const process = __non_webpack_require__("process") as typeof import("process");
const nodeModule = __non_webpack_require__("module") as typeof import("module");

let memfs: typeof import("memfs");
let joinPath: typeof import("memory-fs/lib/join");
let unionfs: typeof import("unionfs");
let webpack: typeof import("webpack");
let WebpackDevServer: typeof import("webpack-dev-server");
let HtmlWebpackPlugin: typeof import("html-webpack-plugin");
// @ts-ignore todo add types
let tailwindcss: typeof import("tailwindcss");
let ReactRefreshPlugin: typeof import("@pmmmwh/react-refresh-webpack-plugin");
let dotenvExpand: typeof import("dotenv-expand");
let dotenv: typeof import("dotenv");

// todo make this a configuration
const ENABLE_FAST_REFRESH = true;
const NODE_ENV = "development";
const REACT_APP = /^REACT_APP_/i;
const ENABLE_BABEL_COMPAT = false;

let webpackCache: Record<
  string,
  | {
      compiler: import("webpack").Compiler;
      inputFs: IFs;
      outputFs: IFs;
      fsContext: LazyReadFileContext;
      devport: number;
      runId: number;
      lastPromise?: Promise<unknown>;
    }
  | undefined
> = {};

export function initialize(nodeModulesPath = "") {
  webpackCache = {};

  // needed to resolve loaders and babel plugins/presets
  if (nodeModulesPath) {
    process.chdir(path.dirname(nodeModulesPath));

    // block deps from being loaded outside the provided nodeModulesPath
    // @ts-expect-error _nodeModulePaths is private
    const nodeModulePaths = nodeModule._nodeModulePaths; //backup the original method
    // @ts-expect-error _nodeModulePaths is private
    nodeModule._nodeModulePaths = function (...args: unknown[]) {
      const paths: string[] = nodeModulePaths.call(this, ...args); // call the original method

      // remove any paths that are not within the provided nodeModulesPath
      let rootPath = nodeModulesPath.replaceAll("\\", "/");
      if (rootPath.endsWith("/"))
        rootPath = rootPath.substring(0, rootPath.length - 1);
      return paths.filter((p) => p.replaceAll("\\", "/").startsWith(rootPath));
    };
  }

  memfs = __non_webpack_require__(`${nodeModulesPath}memfs`);
  joinPath = __non_webpack_require__(`${nodeModulesPath}memory-fs/lib/join`);
  unionfs = __non_webpack_require__(`${nodeModulesPath}unionfs`);
  webpack = __non_webpack_require__(`${nodeModulesPath}webpack`);
  WebpackDevServer = __non_webpack_require__(
    `${nodeModulesPath}webpack-dev-server`
  );
  HtmlWebpackPlugin = __non_webpack_require__(
    `${nodeModulesPath}html-webpack-plugin`
  );
  tailwindcss = __non_webpack_require__(`${nodeModulesPath}tailwindcss`);
  ReactRefreshPlugin = __non_webpack_require__(
    `${nodeModulesPath}@pmmmwh/react-refresh-webpack-plugin`
  );

  dotenvExpand = __non_webpack_require__(`${nodeModulesPath}dotenv-expand`);
  dotenv = __non_webpack_require__(`${nodeModulesPath}dotenv`);
}

const getEnvVars = (projectFolder: string) => {
  const dotenvPath = path.resolve(projectFolder, ".env");
  // https://github.com/bkeepers/dotenv#what-other-env-files-can-i-use
  const dotenvFiles = [
    `${dotenvPath}.${NODE_ENV}.local`,
    `${dotenvPath}.${NODE_ENV}`,
    `${dotenvPath}.local`,
    dotenvPath,
  ];

  // preserve this app's env vars
  // todo clear app specific vars
  const originalEnv = process.env;
  process.env = cloneDeep(originalEnv);

  dotenvFiles.forEach((dotenvFile) => {
    if (fs.existsSync(dotenvFile))
      dotenvExpand(dotenv.config({ path: dotenvFile }));
  });

  const appEnv: Record<string, string | undefined> = {
    NODE_ENV: `"${NODE_ENV}"`,
    // todo fill in
    PUBLIC_URL: `""`,
    CRYLIC_ENABLED: "true",
  };
  // copy REACT_APP env vars
  Object.keys(process.env)
    .filter((key) => REACT_APP.test(key))
    .forEach((key) => {
      appEnv[key] = JSON.stringify(process.env[key]);
    });

  // restore the original env vars
  process.env = originalEnv;

  return appEnv;
};

// supports ts(x), js(x), css, sass, less and everything else as static files
const getWebpackModules = async (
  sourcePath: string,
  env: Record<string, string | undefined>
) => {
  const fileLoaderOptions = {
    name: "static/media/[name].[hash:8].[ext]",
  };

  console.log("sourcePath", sourcePath);
  let sourceInclude = normalizePath(sourcePath, path.sep);
  if (!sourceInclude.endsWith(path.sep)) {
    sourceInclude += path.sep;
  }

  const loaders = [
    // embed small images as data urls
    {
      test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
      loader: "url-loader",
      options: {
        limit: parseInt(env.IMAGE_INLINE_SIZE_LIMIT || "10000"),
        fallback: "file-loader",
        ...fileLoaderOptions,
      },
    },

    // handle project code (swc)
    !ENABLE_BABEL_COMPAT && {
      // Include ts, tsx, js, and jsx files.
      test: /\.(jsx?|tsx?|mjs)$/,
      exclude: /node_modules/,
      use: {
        loader: "swc-loader",
        options: {
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
        },
      },
    },

    // handle project code (babel)
    ENABLE_BABEL_COMPAT && {
      test: /\.(jsx?|tsx?|mjs)$/,
      include: sourceInclude,
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
          ENABLE_FAST_REFRESH && [
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
    ENABLE_BABEL_COMPAT && {
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
      test: /\.s[ac]ss$/,
      use: [
        "style-loader",
        "css-loader",
        {
          loader: "postcss-loader",
          options: {
            ident: "postcss",
            plugins: [tailwindcss],
          },
        },
        "sassjs-loader",
        // {
        //   loader: "sass-loader",
        //   options: {
        //     implementation: nodeSass,
        //   },
        // },
      ],
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

  return { rules: [{ oneOf: loaders }] };
};

function saveFileWithDirs(inputFs: IFs, filePath: string, data: string) {
  inputFs.mkdirpSync(path.dirname(filePath));
  inputFs.writeFileSync(filePath, data);
}

async function fetchAndSave(
  outFs: IFs,
  context: LazyReadFileContext,
  entry: WebpackWorkerMessagePayload_Compile["codeEntries"][0]
) {
  const code = await context.fetchCodeEntry(entry.id);
  if (code) {
    console.log("updating webpack file", entry.filePath);
    saveFileWithDirs(outFs, entry.filePath, code);
    context.savedCodeRevisions[entry.id] = entry.codeRevisionId;
  }
}

interface LazyReadFileContext {
  codeEntriesMap: Map<
    string,
    WebpackWorkerMessagePayload_Compile["codeEntries"][0]
  >;
  savedCodeRevisions: Record<string, number>;
  fetchCodeEntry: (codeEntryId: string) => Promise<string | undefined>;
}

const lazyReadFileFactory = (
  inputFs: IFs,
  context: LazyReadFileContext
) => async (...args: Parameters<typeof inputFs["readFile"]>) => {
  const filePath = args[0] as string;
  const entry = context.codeEntriesMap.get(normalizePath(filePath, path.sep));
  if (entry && entry.codeRevisionId !== context.savedCodeRevisions[entry.id]) {
    await fetchAndSave(inputFs, context, entry);
  }
  inputFs.readFile(...args);
};

export const webpackRunCode = async (
  codeEntries: WebpackWorkerMessagePayload_Compile["codeEntries"],
  primaryCodeEntry: WebpackWorkerMessagePayload_Compile["primaryCodeEntry"],
  { paths, ...config }: WebpackWorkerMessagePayload_Compile["config"],
  onProgress: (arg: { percentage: number; message: string }) => void,
  fetchCodeEntry: (codeEntryId: string) => Promise<string | undefined>
) => {
  if (!webpack) initialize(getAppNodeModules());

  const startTime = new Date().getTime();
  const codeEntriesMap = new Map<string, typeof codeEntries[0]>();
  codeEntries.forEach((e) =>
    codeEntriesMap.set(normalizePath(e.filePath, path.sep), e)
  );

  // todo clear cache on project close
  if (!webpackCache[primaryCodeEntry.id]) {
    const env = getEnvVars(paths.projectFolder);

    const templateOptions =
      paths.htmlTemplate && fs.existsSync(paths.htmlTemplate)
        ? { template: paths.htmlTemplate }
        : { templateContent: baseAppEntry };

    const projectNodeModules = path.resolve(
      paths.projectFolder,
      "node_modules"
    ); // appNodeModules
    const modules = getCraModules({ ...paths, projectNodeModules });

    let options: import("webpack").Configuration = {
      mode: NODE_ENV,
      // entry: [require.resolve('react-dev-utils/webpackHotDevClient'),primaryCodeEntry.filePath]
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
        globalObject: "this",
      },
      optimization: {
        // Automatically split vendor and commons
        splitChunks: {
          chunks: "all",
          name: false,
        },
        // Keep the runtime chunk separated to enable long term caching
        runtimeChunk: {
          name: (entrypoint) => `runtime-${entrypoint.name}`,
        },
      },
      module: await getWebpackModules(paths.projectSrcFolder, env),
      resolve: {
        modules: ["node_modules", projectNodeModules].concat(
          modules.additionalModulePaths || []
        ),
        extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
        alias: {
          "react-native": "react-native-web",
          // lm_c76a4fbc3b webpack externals
          ...(!config.disableWebpackExternals
            ? {
                react: __non_webpack_require__.resolve("react"),
                "react-dom": __non_webpack_require__.resolve("react-dom"),
                "react-refresh/runtime": __non_webpack_require__.resolve(
                  "react-refresh/runtime"
                ),
              }
            : {}),
          ...(modules.webpackAliases || {}),
        },
        // plugins: [PnpWebpackPlugin]
      },
      // resolveLoader: { plugins: [PnpWebpackPlugin.moduleLoader(module)] },
      plugins: [
        // Generates an `index.html` file with the <script> injected.
        new HtmlWebpackPlugin({
          inject: true,
          ...templateOptions,
        }),
        // InterpolateHtmlPlugin
        // ModuleNotFoundPlugin
        new webpack.DefinePlugin({ "process.env": env }),
        ENABLE_FAST_REFRESH && new webpack.HotModuleReplacementPlugin(),
        // WatchMissingNodeModulesPlugin
        // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
        new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
        new webpack.ProgressPlugin({
          handler(percentage, message, ...args) {
            onProgress({ percentage, message });
          },
        }),
        ENABLE_FAST_REFRESH && new ReactRefreshPlugin({ forceEnable: true }),
      ].filter((p): p is typeof webpack.Plugin => !!p),
      node: {
        module: "empty",
        dgram: "empty",
        dns: "mock",
        fs: "empty",
        http2: "empty",
        net: "empty",
        tls: "empty",
        child_process: "empty",
      },
    };

    // handle a config override specified for this project
    if (paths.overrideWebpackConfig) {
      // todo verify this require returns a function, also maybe run it in a vm are pass an instance of webpack
      const overrideConfig = requireUncached(paths.overrideWebpackConfig);

      const result = await overrideConfig(
        options,
        webpack,
        primaryCodeEntry.filePath
      );
      if (result) {
        options = result;
      }
    }

    const fsContext: LazyReadFileContext = {
      fetchCodeEntry,
      codeEntriesMap,
      savedCodeRevisions: {},
    };

    const compiler = webpack(options);
    const volume = new memfs.Volume();
    const inputFs = memfs.createFsFromVolume(volume);
    const outputFs = inputFs;
    const ufs1 = new unionfs.Union();
    // @ts-ignore bad types
    ufs1.use(fs).use({
      ...inputFs,
      // @ts-ignore bad types
      readFile: lazyReadFileFactory(inputFs, fsContext),
    });

    saveFileWithDirs(
      inputFs,
      primaryCodeEntry.filePath,
      primaryCodeEntry.code!
    );

    compiler.inputFileSystem = ufs1;
    // @ts-ignore bad types
    compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
    // @ts-ignore bad types
    compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
    // @ts-ignore bad types
    compiler.resolvers.loader.fileSystem = compiler.inputFileSystem;

    // @ts-ignore bug in typescript
    compiler.outputFileSystem = {
      join: joinPath,
      ...outputFs,
    };

    // stub out compiler.watch so that webpack-dev-server doesn't call it and instead relies on the manual compiler.run calls made below
    // const compilerWatch = compiler.watch;
    compiler.watch = () => ({ close() {}, invalidate() {} });

    const devServer = new WebpackDevServer(compiler, {
      disableHostCheck: true,
      compress: true,
      clientLogLevel: "none",
      contentBase: path.resolve(paths.projectFolder, "public"),
      // contentBasePublicPath: paths.publicUrlOrPath,
      // todo fix hmr behavior for non-source code assets
      // watchContentBase: true,
      hot: ENABLE_FAST_REFRESH,
      transportMode: "ws",
      injectClient: true,
      // sockHost,
      // sockPath,
      // sockPort,
      // publicPath: paths.publicUrlOrPath.slice(0, -1),
      publicPath: "/",
      // quiet: true,
      // watchOptions: { ignored: ignoredFiles(paths.appSrc) },
      // host,
      // overlay: false,
      historyApiFallback: {
        disableDotRule: true,
        index: "/", //paths.publicUrlOrPath,
      },
      // public: allowedHost,
      // proxy,
      // @ts-ignore ignore type error for hidden option
      fs: compiler.outputFileSystem,
    });

    // Launch WebpackDevServer.
    const server = devServer.listen(0, (err) => {
      if (err) {
        return console.log(err);
      }
    });
    const devport = await new Promise<number>((resolve) => {
      server.once("listening", () => {
        console.log("dev server listening", server.address());
        resolve((server.address() as AddressInfo).port);
        // todo add timeout
      });
    });

    console.log("initialized webpack");
    webpackCache[primaryCodeEntry.id] = {
      compiler,
      inputFs,
      outputFs,
      fsContext,
      devport,
      runId: 0,
    };
  } else {
    const { inputFs, fsContext } = webpackCache[primaryCodeEntry.id]!;
    fsContext.fetchCodeEntry = fetchCodeEntry;
    fsContext.codeEntriesMap = codeEntriesMap;
    saveFileWithDirs(
      inputFs,
      primaryCodeEntry.filePath,
      primaryCodeEntry.code!
    );
    await Promise.all(
      Object.entries(fsContext.savedCodeRevisions).map(
        async ([codeId, revision]) => {
          const entry = codeEntries.find((e) => e.id === codeId);
          if (entry && entry.codeRevisionId !== revision) {
            await fetchAndSave(inputFs, fsContext, entry);
          }
        }
      )
    );
  }
  const { compiler, devport } = webpackCache[primaryCodeEntry.id]!;
  const runId = ++webpackCache[primaryCodeEntry.id]!.runId;

  // only allow one instance of webpack to run at a time
  while (webpackCache[primaryCodeEntry.id]!.lastPromise) {
    await webpackCache[primaryCodeEntry.id]!.lastPromise;
  }
  if (runId !== webpackCache[primaryCodeEntry.id]!.runId) {
    return null;
  }

  console.log("running webpack");
  const runPromise = new Promise<number>((resolve, reject) => {
    compiler.run((err, stats) => {
      console.log("webpackRunCode" /* , err, stats */);
      if (err) {
        reject(err);
        return;
      }

      const endTime = new Date().getTime();
      console.log("loaded", primaryCodeEntry.filePath, endTime - startTime);
      // fs.writeFileSync("outputfs.json", JSON.stringify(volume.toJSON(), null, 4));
      resolve(devport);
    });
  }).finally(() => {
    webpackCache[primaryCodeEntry.id]!.lastPromise = undefined;
  });
  webpackCache[primaryCodeEntry.id]!.lastPromise = runPromise;
  return runPromise;
};
