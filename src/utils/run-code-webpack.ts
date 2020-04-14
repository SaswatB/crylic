import { createFsFromVolume, Volume, IFs } from "memfs";
import { Union } from "unionfs";
import joinPath from "memory-fs/lib/join";

const webpack = __non_webpack_require__("webpack") as typeof import("webpack");

// supports ts, jsx, css, sass, less and
const WEBPACK_MODULES = {
  rules: [
    {
      test: /\.(j|t)sx?$/,
      use: {
        loader: "babel-loader",
        options: {
          presets: [
            ["@babel/preset-env", {
              "targets": {
                "electron": "8",
              }
            }],
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
            implementation: __non_webpack_require__("dart-sass"),
          },
        },
        {
          loader: "postcss-loader",
          options: {
            ident: "postcss",
            plugins: [__non_webpack_require__("tailwindcss")],
          },
        },
      ],
    },
    {
      test: /\.less$/,
      use: ["style-loader", "css-loader", "less-loader"],
    },
  ],
};

const webpackCache: Record<string, {compiler: import("webpack").Compiler, inputFs: IFs, outputFs: IFs, runId: number, lastPromise?: Promise<unknown>} | undefined> = {};

export const webpackRunCode = async (
  codePath = "/untitled.jsx",
  code: string,
  { window }: any
) => {
  const startTime = new Date().getTime();
  console.log("loading...", codePath);
  if (!webpackCache[codePath]) {
    const compiler = webpack({
      mode: "development",
      entry: codePath,
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
      },
    });
    const ufs1 = new Union();
    const inputFs = createFsFromVolume(new Volume());

    // @ts-ignore bad types
    ufs1.use(__non_webpack_require__("fs")).use(inputFs);
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

    webpackCache[codePath] = { compiler, inputFs, outputFs, runId: 0 };
  }
  const { compiler, inputFs, outputFs } = webpackCache[codePath]!;
  inputFs.writeFileSync(codePath, code);

  const runId = ++webpackCache[codePath]!.runId;

  // only allow one instance of webpack to run at a time
  while (webpackCache[codePath]!.lastPromise) {
    await webpackCache[codePath]!.lastPromise;
  }
  if (runId !== webpackCache[codePath]!.runId) {
    return null;
  }

  console.log('running webpack')
  const runPromise = new Promise<object>((resolve, reject) => {
    compiler.run((err, stats) => {
      try {
        if (err) throw err;

        console.log("webpackRunCode", err, stats);
        const bundle = outputFs.readFileSync("/static/main.js", {
          encoding: "utf-8",
        }) as string;
        let moduleExports: any = {};
        let exports: any = {};
        window.require = (name: string) => {
          if (name === "react") return require("react");
          if (name === "react-dom") return require("react-dom");
          return __non_webpack_require__(name);
          // throw new Error(`Unable to require "${name}"`)
        };
        window.module = moduleExports;
        window.exports = exports;
        window.eval(bundle);
        const endTime = new Date().getTime();
        console.log("loaded", codePath, endTime - startTime);

        resolve(moduleExports.exports || exports);
      } catch (error) {
        console.log("error file", codePath, error);
        reject(error);
      }
    });
  }).finally(() => {
    webpackCache[codePath]!.lastPromise = undefined;
  });
  webpackCache[codePath]!.lastPromise = runPromise;
  return runPromise;
};
