// import getCSSModuleLocalIdent from "react-dev-utils/getCSSModuleLocalIdent";
import cors from "cors";
import { cloneDeep } from "lodash";

type IFs = import("memfs").IFs;

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");
const crypto = __non_webpack_require__("crypto") as typeof import("crypto");
const process = __non_webpack_require__("process") as typeof import("process");

let memfs: typeof import("memfs");
let joinPath: typeof import("memory-fs/lib/join");
let unionfs: typeof import("unionfs");
let webpack: typeof import("webpack");
// let nodeSass: typeof import("node-sass");
// @ts-ignore todo add types
let tailwindcss: typeof import("tailwindcss");
let ReactRefreshPlugin: typeof import("@pmmmwh/react-refresh-webpack-plugin");
let express: typeof import("express");
// @ts-ignore todo add types
let send: typeof import("send");
let dotenvExpand: typeof import("dotenv-expand");
let dotenv: typeof import("dotenv");

const ENABLE_FAST_REFRESH = false;
const NODE_ENV = "development";
const REACT_APP = /^REACT_APP_/i;

const overrideConfigCache: Record<string, Function | undefined> = {};

let staticFileServer: ReturnType<typeof import("express")>;
let assetPort = Promise.resolve(0);
let assetSecurityToken: string;

export function initialize(nodeModulesPath = "") {
  // needed to resolve loaders and babel plugins/presets
  if (nodeModulesPath) {
    process.chdir(path.dirname(nodeModulesPath));
  }

  memfs = __non_webpack_require__(`${nodeModulesPath}memfs`);
  joinPath = __non_webpack_require__(`${nodeModulesPath}memory-fs/lib/join`);
  unionfs = __non_webpack_require__(`${nodeModulesPath}unionfs`);
  webpack = __non_webpack_require__(`${nodeModulesPath}webpack`);
  // nodeSass = __non_webpack_require__(`${nodeModulesPath}node-sass`);
  tailwindcss = __non_webpack_require__(`${nodeModulesPath}tailwindcss`);
  ReactRefreshPlugin = __non_webpack_require__(
    `${nodeModulesPath}@pmmmwh/react-refresh-webpack-plugin`
  );

  express = __non_webpack_require__(`${nodeModulesPath}express`);
  send = __non_webpack_require__(`${nodeModulesPath}send`);
  dotenvExpand = __non_webpack_require__(`${nodeModulesPath}dotenv-expand`);
  dotenv = __non_webpack_require__(`${nodeModulesPath}dotenv`);

  assetSecurityToken = crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/[+/=]/g, "");

  staticFileServer = express();
  staticFileServer.use(cors());
  staticFileServer.get(`/files/${assetSecurityToken}/:codeId/*`, (req, res) => {
    const staticPath = `/public/${req.params[0]}`;
    console.log("static file request at", staticPath);
    res.contentType(send.mime.lookup(staticPath) || "");
    return res.end(
      webpackCache[req.params.codeId]?.outputFs.readFileSync(staticPath)
    );
  });
  assetPort = new Promise((resolve) => {
    const serverInstance = staticFileServer.listen(0, "localhost", () => {
      const { port } = serverInstance.address() as { port: number };
      console.log("Static file server is running...", port);
      resolve(port);
    });
  });
}

const getEnvVars = (projectFolder: string, assetPath: string) => {
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
    PUBLIC_URL: `"${assetPath}"`,
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
  assetPath: string,
  env: Record<string, string | undefined>
) => {
  const fileLoaderOptions = {
    name: "static/media/[name].[hash:8].[ext]",
    outputPath: "/public",
    publicPath: assetPath,
  };

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

    // handle project code
    {
      test: /\.(jsx?|tsx?|mjs)$/,
      // include: paths.appSrc,
      loader: "babel-loader",
      options: {
        presets: [
          [
            "@babel/preset-env",
            {
              targets: {
                // todo change on publish or support more options
                electron: "8",
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
          ENABLE_FAST_REFRESH && "react-refresh/babel",
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
    // handle js outside of project's source directory
    {
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
                // todo change on publish or support more options
                electron: "8",
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
  ];

  return { rules: [{ oneOf: loaders }] };
};

const webpackCache: Record<
  string,
  | {
      compiler: import("webpack").Compiler;
      inputFs: IFs;
      outputFs: IFs;
      savedCodeRevisions: Record<string, number | undefined>;
      runId: number;
      lastPromise?: Promise<unknown>;
    }
  | undefined
> = {};

export const webpackRunCode = async (
  codeEntries: {
    id: string;
    filePath: string;
    code?: string;
    codeRevisionId: number;
  }[],
  selectedCodeId: string,
  paths: {
    projectFolder: string;
    projectSrcFolder: string;
    overrideWebpackConfig?: string;
  },
  onProgress: (arg: { percentage: number; message: string }) => void
) => {
  if (!webpack) initialize();

  const startTime = new Date().getTime();
  const primaryCodeEntry = codeEntries.find(
    (entry) => entry.id === selectedCodeId
  );
  console.log("loading...", selectedCodeId, primaryCodeEntry, codeEntries);
  if (!primaryCodeEntry) throw new Error("Failed to find primary code entry");

  if (!webpackCache[primaryCodeEntry.id]) {
    const assetPath = `http://localhost:${await assetPort}/files/${assetSecurityToken}/${selectedCodeId}/`;
    const env = getEnvVars(paths.projectFolder, assetPath);

    let options: import("webpack").Configuration = {
      mode: NODE_ENV,
      // entry: [require.resolve('react-dev-utils/webpackHotDevClient'),primaryCodeEntry.filePath]
      entry: primaryCodeEntry.filePath,
      devtool: false,
      performance: false,
      output: {
        path: "/static",
        filename: "[name].js",
        // publicPath:
        // jsonpFunction:
        // devtoolModuleFilenameTemplate:
        chunkFilename: "[name].chunk.js",
        library: "paintbundle",
        libraryTarget: "umd",
        globalObject: "this",
      },
      module: await getWebpackModules(assetPath, env),
      resolve: {
        // modules: ['node_modules', paths.appNodeModules].concat(
        //   modules.additionalModulePaths || []
        // ),
        extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
        alias: {
          "react-native": "react-native-web",
          // src: paths.appSrc
        },
        // plugins: [PnpWebpackPlugin]
      },
      // resolveLoader: { plugins: [PnpWebpackPlugin.moduleLoader(module)] },
      externals: {
        react: {
          commonjs: "react",
          commonjs2: "react",
          amd: "react",
          root: "React",
        },
        "react-dom": {
          commonjs: "react-dom",
          commonjs2: "react-dom",
          amd: "react-dom",
          root: "ReactDOM",
        },
        "react-router-dom": {
          commonjs: "react-router-dom",
          commonjs2: "react-router-dom",
          amd: "react-router-dom",
          root: "ReactRouterDOM",
        },
        "react-refresh/runtime": {
          commonjs: "react-refresh/runtime",
          commonjs2: "react-refresh/runtime",
          amd: "react-refresh/runtime",
        },
        // this is externalized so that the default project template can be loaded without npm i
        "normalize.css": {
          commonjs: "normalize.css",
          commonjs2: "normalize.css",
          amd: "normalize.css",
        },
      },
      plugins: [
        // HtmlWebpackPlugin
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
        ENABLE_FAST_REFRESH && new ReactRefreshPlugin(),
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
      const overrideConfig =
        overrideConfigCache[paths.overrideWebpackConfig] ||
        __non_webpack_require__(paths.overrideWebpackConfig);
      overrideConfigCache[paths.overrideWebpackConfig] = overrideConfig;

      const result = await overrideConfig(
        options,
        webpack,
        primaryCodeEntry.filePath
      );
      if (result) {
        options = result;
      }
    }

    const compiler = webpack(options);
    const inputFs = memfs.createFsFromVolume(new memfs.Volume());
    const outputFs = inputFs;
    const ufs1 = new unionfs.Union();
    // @ts-ignore bad types
    ufs1.use(fs).use(inputFs);

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

    console.log("initialized webpack", compiler, inputFs, outputFs);
    webpackCache[primaryCodeEntry.id] = {
      compiler,
      inputFs,
      outputFs,
      savedCodeRevisions: {},
      runId: 0,
    };
  }
  const { compiler, inputFs, outputFs, savedCodeRevisions } = webpackCache[
    primaryCodeEntry.id
  ]!;
  // todo handle deleted code entries
  codeEntries
    .filter(
      (entry) =>
        entry.code !== undefined &&
        entry.codeRevisionId !== savedCodeRevisions[entry.id]
    )
    .forEach((entry) => {
      inputFs.mkdirpSync(path.dirname(entry.filePath));
      inputFs.writeFileSync(entry.filePath, entry.code!);
      savedCodeRevisions[entry.id] = entry.codeRevisionId;
      console.log("updating webpack file", entry.filePath);
    });

  const runId = ++webpackCache[primaryCodeEntry.id]!.runId;

  // only allow one instance of webpack to run at a time
  while (webpackCache[primaryCodeEntry.id]!.lastPromise) {
    await webpackCache[primaryCodeEntry.id]!.lastPromise;
  }
  if (runId !== webpackCache[primaryCodeEntry.id]!.runId) {
    return null;
  }

  console.log("running webpack");
  const runPromise = new Promise<string>((resolve, reject) => {
    compiler.run((err, stats) => {
      try {
        if (err) throw err;

        console.log("webpackRunCode", err, stats);
        const bundle = outputFs.readFileSync("/static/main.js", {
          encoding: "utf-8",
        });
        const endTime = new Date().getTime();
        console.log("loaded", primaryCodeEntry.filePath, endTime - startTime);

        resolve(bundle as string);
      } catch (error) {
        console.log("error file", primaryCodeEntry.filePath, error);
        reject(error);
      }
    });
  }).finally(() => {
    webpackCache[primaryCodeEntry.id]!.lastPromise = undefined;
  });
  webpackCache[primaryCodeEntry.id]!.lastPromise = runPromise;
  return runPromise;
};
