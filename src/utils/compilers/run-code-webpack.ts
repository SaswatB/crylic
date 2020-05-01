import { createFsFromVolume, IFs, Volume } from "memfs";
import joinPath from "memory-fs/lib/join";
import { Union } from "unionfs";

import { CodeEntry } from "../../types/paint";

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");
let webpack: typeof import("webpack");
let dartSass;
let tailwindcss;

export function initialize(nodeModulesPath = "") {
  webpack = __non_webpack_require__(`${nodeModulesPath}webpack`);
  dartSass = __non_webpack_require__(`${nodeModulesPath}dart-sass`);
  tailwindcss = __non_webpack_require__(`${nodeModulesPath}tailwindcss`);
}

// supports ts, jsx, css, sass, less and
const WEBPACK_MODULES = {
  rules: [
    {
      test: /\.(j|t)sx?$/,
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
      test: /\.scss$/,
      use: [
        "style-loader",
        "css-loader",
        {
          loader: "sass-loader",
          options: {
            // use dart sass to avoid node compatibility issues
            implementation: dartSass,
          },
        },
        {
          loader: "postcss-loader",
          options: {
            ident: "postcss",
            plugins: [tailwindcss],
          },
        },
      ],
    },
    {
      test: /\.less$/,
      use: ["style-loader", "css-loader", "less-loader"],
    },
    {
      test: /\.svg$/,
      use: ["svg-url-loader"],
    },
    // {
    //   loader: require.resolve("file-loader"),
    //   // Exclude `js` files to keep "css" loader working as it injects
    //   // its runtime that would otherwise be processed through "file" loader.
    //   // Also exclude `html` and `json` extensions so they get processed
    //   // by webpacks internal loaders.
    //   exclude: [
    //     /\.(js|mjs|jsx|ts|tsx)$/,
    //     /\.html$/,
    //     /\.json$/,
    //     /\.(s?css|sass|less)$/,
    //   ],
    //   options: {
    //     name: "static/media/[name].[hash:8].[ext]",
    //   },
    // },
  ],
};

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
  codeEntries: CodeEntry[],
  selectedCodeId: string
) => {
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
      module: WEBPACK_MODULES,
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
    const ufs1 = new Union();
    const inputFs = createFsFromVolume(new Volume());

    // @ts-ignore bad types
    ufs1.use(fs).use(inputFs);
    compiler.inputFileSystem = ufs1;
    // @ts-ignore bad types
    compiler.resolvers.normal.fileSystem = compiler.inputFileSystem;
    // @ts-ignore bad types
    compiler.resolvers.context.fileSystem = compiler.inputFileSystem;
    // @ts-ignore bad types
    compiler.resolvers.loader.fileSystem = compiler.inputFileSystem;

    const outputFs = createFsFromVolume(new Volume());
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
