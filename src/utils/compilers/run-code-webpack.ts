type IFs = import("memfs").IFs;

let path = __non_webpack_require__("path") as typeof import("path");
let fs = __non_webpack_require__("fs") as typeof import("fs");

let memfs: typeof import("memfs");
let joinPath: typeof import("memory-fs/lib/join");
let unionfs: typeof import("unionfs");
let webpack: typeof import("webpack");
let nodeSass: typeof import("node-sass");
// @ts-ignore todo add types
let tailwindcss: typeof import("tailwindcss");
let express: typeof import("express");

let staticFileServer: ReturnType<typeof import("express")>;

export function initialize(nodeModulesPath = "") {
  memfs = __non_webpack_require__(`${nodeModulesPath}memfs`);
  joinPath = __non_webpack_require__(`${nodeModulesPath}memory-fs/lib/join`);
  unionfs = __non_webpack_require__(`${nodeModulesPath}unionfs`);
  webpack = __non_webpack_require__(`${nodeModulesPath}webpack`);
  nodeSass = __non_webpack_require__(`${nodeModulesPath}node-sass`);
  tailwindcss = __non_webpack_require__(`${nodeModulesPath}tailwindcss`);

  express = __non_webpack_require__(
    `${nodeModulesPath}express`
  ) as typeof import("express");

  // todo make this more secure
  staticFileServer = express();
  staticFileServer.get(`/files/:codeId/*`, (req, res) => {
    const staticPath = `/public/${req.params[0]}`;
    console.log("static file request at", staticPath);
    res.contentType(
      __non_webpack_require__("send").mime.lookup(staticPath) || ""
    );
    return res.end(
      webpackCache[req.params.codeId]?.outputFs.readFileSync(staticPath)
    );
  });
  staticFileServer.listen(5000, "localhost", () =>
    console.log("Static file server is running...")
  );
}

// supports ts, jsx, css, sass, less and
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
          ],
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
        {
          loader: "sass-loader",
          options: {
            implementation: nodeSass,
          },
        },
      ],
    },
    {
      test: /\.less$/,
      use: ["style-loader", "css-loader", "less-loader"],
    },
    {
      loader: require.resolve("file-loader"),
      exclude: [
        /\.(js|mjs|jsx|ts|tsx)$/,
        /\.html$/,
        /\.json$/,
        /\.(s?css|sass|less)$/,
      ],
      options: {
        name: "static/media/[name].[hash:8].[ext]",
        outputPath: "/public",
        publicPath: `http://localhost:5000/files/${codeId}/`,
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
  codeEntries: { id: string; filePath: string; code: string }[],
  selectedCodeId: string
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
        },
        "react-dom": {
          commonjs: "react-dom",
          commonjs2: "react-dom",
          amd: "react-dom",
        },
        "react-router-dom": {
          commonjs: "react-router-dom",
          commonjs2: "react-router-dom",
          amd: "react-router-dom",
        },
      },
      // plugins: [
      //   new webpack.ProgressPlugin({
      //     handler(percentage, msg) {
      //       console.log("wb progress", percentage, msg);
      //     },
      //   }),
      // ],
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
  codeEntries.forEach((entry) => {
    inputFs.mkdirpSync(path.dirname(entry.filePath));
    inputFs.writeFileSync(entry.filePath, entry.code);
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
