type IFs = import("memfs").IFs;

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");
const crypto = __non_webpack_require__("crypto") as typeof import("crypto");

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

const ENABLE_FAST_REFRESH = false;

let staticFileServer: ReturnType<typeof import("express")>;

let assetPort = 0;
let assetSecurityToken: string;

export function initialize(nodeModulesPath = "") {
  // needed to resolve loaders and babel plugins/presets
  if (nodeModulesPath) {
    __non_webpack_require__("process").chdir(path.dirname(nodeModulesPath));
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

  assetSecurityToken = crypto
    .randomBytes(32)
    .toString("base64")
    .replace(/[+/=]/g, "");

  staticFileServer = express();
  staticFileServer.get(`/files/:codeId/*`, (req, res) => {
    // check against a generated security token to prevent outside access
    if (req.query.token !== assetSecurityToken) {
      console.log("unauthorized access blocked");
      return res.status(401).send();
    }

    const staticPath = `/public/${req.params[0]}`;
    console.log("static file request at", staticPath);
    res.contentType(send.mime.lookup(staticPath) || "");
    return res.end(
      webpackCache[req.params.codeId]?.outputFs.readFileSync(staticPath)
    );
  });
  const serverInstance = staticFileServer.listen(assetPort, "localhost", () => {
    assetPort = (serverInstance.address() as { port: number }).port;
    console.log("Static file server is running...", assetPort);
  });
}

// supports ts(x), js(x), css, sass, less and everything else as static files
const getWebpackModules = (codeId: string) => ({
  rules: [
    {
      test: /\.[jt]sx?$/,
      use: {
        loader: "babel-loader",
        options: {
          presets: [
            [
              "@babel/preset-env",
              {
                targets: {
                  electron: "8",
                },
              },
            ],
            "@babel/preset-react",
            "@babel/preset-typescript",
          ],
          plugins: [
            "@babel/proposal-class-properties",
            "@babel/proposal-object-rest-spread",
            ENABLE_FAST_REFRESH && "react-refresh/babel",
          ].filter((r) => !!r),
        },
      },
    },
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
    {
      loader: "file-loader",
      exclude: [
        /\.(js|mjs|jsx|ts|tsx)$/,
        /\.html$/,
        /\.json$/,
        /\.(s?css|sass|less)$/,
      ],
      options: {
        name: "static/media/[name].[hash:8].[ext]",
        outputPath: "/public",
        publicPath: `http://localhost:${assetPort}/files/${codeId}/`,
        postTransformPublicPath: (p: string) =>
          `"${p.replace(/"/g, "")}?token=${assetSecurityToken}"`,
      },
    },
  ],
});

const webpackCache: Record<
  string,
  | {
      compiler: import("webpack").Compiler;
      inputFs: IFs;
      outputFs: IFs;
      runId: number;
      lastPromise?: Promise<unknown>;
    }
  | undefined
> = {};

export const webpackRunCode = async (
  codeEntries: { id: string; filePath: string; code?: string }[],
  selectedCodeId: string,
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
    const compiler = webpack({
      mode: "development",
      entry: primaryCodeEntry.filePath,
      devtool: false,
      output: {
        path: "/static",
        filename: "[name].js",
        library: "paintbundle",
        libraryTarget: "umd",
      },
      module: getWebpackModules(selectedCodeId),
      resolve: {
        extensions: [".jsx", ".json", ".js", ".ts", ".tsx"],
      },
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
        // this is externalized so that the default project template can be loaded without npm i
        "normalize.css": {
          commonjs: "normalize.css",
          commonjs2: "normalize.css",
          amd: "normalize.css",
        },
      },
      plugins: [
        new webpack.ProgressPlugin({
          handler(percentage, message, ...args) {
            onProgress({ percentage, message });
          },
        }),
        ENABLE_FAST_REFRESH && new ReactRefreshPlugin(),
      ].filter((p): p is typeof webpack.Plugin => !!p),
    });
    const ufs1 = new unionfs.Union();
    const inputFs = memfs.createFsFromVolume(new memfs.Volume());

    // @ts-ignore bad types
    ufs1.use(fs).use(inputFs);
    compiler.inputFileSystem = ufs1;
    // @ts-ignore bad types
    compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
    // @ts-ignore bad types
    compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
    // @ts-ignore bad types
    compiler.resolvers.loader.fileSystem = compiler.inputFileSystem;

    const outputFs = memfs.createFsFromVolume(new memfs.Volume());
    // @ts-ignore bug in typescript
    compiler.outputFileSystem = {
      join: joinPath,
      ...outputFs,
    };

    webpackCache[primaryCodeEntry.id] = {
      compiler,
      inputFs,
      outputFs,
      runId: 0,
    };
  }
  const { compiler, inputFs, outputFs } = webpackCache[primaryCodeEntry.id]!;
  // todo handle deleted code entries
  codeEntries
    .filter((entry) => entry.code !== undefined)
    .forEach((entry) => {
      inputFs.mkdirpSync(path.dirname(entry.filePath));
      inputFs.writeFileSync(entry.filePath, entry.code!);
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
