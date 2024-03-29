import { forOwn, get, isArray } from "lodash";

import { normalizePath } from "synergy/src/lib/normalizePath";

import { WebpackWorkerMessagePayload_Compile } from "../../types/ipc";
import { getAppNodeModules } from "../utils";
import { webpackConfigFactory } from "./helpers/webpack-config-factory";

type IFs = import("memfs").IFs;

const nativeDeps = {
  // node deps
  path: __non_webpack_require__("path") as typeof import("path"),
  fs: __non_webpack_require__("fs") as typeof import("fs"),
  process: __non_webpack_require__("process") as typeof import("process"),
  nodeModule: __non_webpack_require__("module") as typeof import("module"),
  // library deps

  memfs: undefined as unknown as typeof import("memfs"),
  joinPath: undefined as unknown as typeof import("memory-fs/lib/join"),
  unionfs: undefined as unknown as typeof import("unionfs"),
  webpack:
    undefined as unknown as typeof import("../../../app/node_modules/webpack"),
  WebpackDevServer:
    undefined as unknown as typeof import("../../../app/node_modules/webpack-dev-server"),
  HtmlWebpackPlugin:
    undefined as unknown as typeof import("html-webpack-plugin"),
  ReactRefreshPlugin:
    undefined as unknown as typeof import("@pmmmwh/react-refresh-webpack-plugin"),
  NodePolyfillPlugin:
    // @ts-expect-error todo add types
    undefined as unknown as typeof import("node-polyfill-webpack-plugin"),
  dotenvExpand: undefined as unknown as typeof import("dotenv-expand"),
  dotenv: undefined as unknown as typeof import("dotenv"),
  requireFromString:
    undefined as unknown as typeof import("require-from-string"),
};
const nativeDepsPaths = {
  modules: "",
  react: "",
  "react-dom": "",
  "react-refresh/runtime": "",
};

let webpackCache: Record<
  string,
  | {
      compiler: import("../../../app/node_modules/webpack").Compiler;
      inputFs: IFs;
      outputFs: IFs;
      fsContext: LazyReadFileContext;
      devport: number;
      runId: number;
      lastPromise?: Promise<unknown>;
    }
  | undefined
> = {};
let pluginEvalDirectory = "";

export function initialize(nodeModulesPath = "") {
  resetWebpack();

  // needed to resolve loaders and babel plugins/presets
  if (nodeModulesPath) {
    try {
      const newPath = nativeDeps.path.dirname(nodeModulesPath);
      console.log("changing directory", newPath);
      process.chdir(newPath);
    } catch (e) {
      console.error(e);
    }

    // todo restore if project module paths can be allowed
    // block deps from being loaded outside the provided nodeModulesPath
    // _nodeModulePaths is private
    // const nodeModulePaths = (nativeDeps.nodeModule as any)._nodeModulePaths; //backup the original method
    // (nativeDeps.nodeModule as any)._nodeModulePaths = function (
    //   ...args: unknown[]
    // ) {
    //   const paths: string[] = nodeModulePaths.call(this, ...args); // call the original method

    //   // remove any paths that are not within the provided nodeModulesPath
    //   let rootPath = nodeModulesPath.replaceAll("\\", "/");
    //   if (rootPath.endsWith("/"))
    //     rootPath = rootPath.substring(0, rootPath.length - 1);
    //   return paths.filter((p) => p.replaceAll("\\", "/").startsWith(rootPath));
    // };
  }
  // lm_ed556f628a used for resolving loaders in next plugin
  pluginEvalDirectory = nodeModulesPath || __dirname;

  Object.keys(nativeDepsPaths).forEach((key) => {
    if (key === "modules") nativeDepsPaths.modules = nodeModulesPath;
    else
      nativeDepsPaths[key as keyof typeof nativeDepsPaths] =
        __non_webpack_require__.resolve(key);
  });

  nativeDeps.memfs = __non_webpack_require__(`${nodeModulesPath}memfs`);
  nativeDeps.joinPath = __non_webpack_require__(
    `${nodeModulesPath}memory-fs/lib/join`
  );
  nativeDeps.unionfs = __non_webpack_require__(`${nodeModulesPath}unionfs`);
  nativeDeps.webpack = __non_webpack_require__(`${nodeModulesPath}webpack`);
  nativeDeps.WebpackDevServer = __non_webpack_require__(
    `${nodeModulesPath}webpack-dev-server`
  );
  nativeDeps.HtmlWebpackPlugin = __non_webpack_require__(
    `${nodeModulesPath}html-webpack-plugin`
  );
  nativeDeps.ReactRefreshPlugin = __non_webpack_require__(
    `${nodeModulesPath}@pmmmwh/react-refresh-webpack-plugin`
  );
  nativeDeps.NodePolyfillPlugin = __non_webpack_require__(
    `${nodeModulesPath}node-polyfill-webpack-plugin`
  );

  nativeDeps.dotenvExpand = __non_webpack_require__(
    `${nodeModulesPath}dotenv-expand`
  );
  nativeDeps.dotenv = __non_webpack_require__(`${nodeModulesPath}dotenv`);
  nativeDeps.requireFromString = __non_webpack_require__(
    `${nodeModulesPath}require-from-string`
  );
}

export function resetWebpack() {
  webpackCache = {};
}

function saveFileWithDirs(inputFs: IFs, filePath: string, data: string) {
  inputFs.mkdirpSync(nativeDeps.path.dirname(filePath));
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

const lazyReadFileFactory =
  (inputFs: IFs, context: LazyReadFileContext) =>
  async (...args: Parameters<typeof inputFs["readFile"]>) => {
    const filePath = args[0] as string;
    const entry = context.codeEntriesMap.get(
      normalizePath(filePath, nativeDeps.path.sep)
    );
    if (
      entry &&
      entry.codeRevisionId !== context.savedCodeRevisions[entry.id]
    ) {
      await fetchAndSave(inputFs, context, entry);
    }
    inputFs.readFile(...args);
  };

export const webpackRunCode = async (
  codeEntries: WebpackWorkerMessagePayload_Compile["codeEntries"],
  primaryCodeEntry: WebpackWorkerMessagePayload_Compile["primaryCodeEntry"],
  config: WebpackWorkerMessagePayload_Compile["config"],
  onProgress: (arg: { percentage: number; message: string }) => void,
  fetchCodeEntry: (codeEntryId: string) => Promise<string | undefined>
) => {
  if (!nativeDeps.webpack) initialize(getAppNodeModules());
  try {
    const newPath = config.paths.projectFolder;
    console.log("changing directory", newPath);
    process.chdir(newPath);
  } catch (e) {
    console.error(e);
  }

  const {
    path,
    fs,
    webpack,
    memfs,
    unionfs,
    joinPath,
    WebpackDevServer,
    requireFromString,
  } = nativeDeps;

  const startTime = new Date().getTime();
  const codeEntriesMap = new Map<string, typeof codeEntries[0]>();
  codeEntries.forEach((e) =>
    codeEntriesMap.set(normalizePath(e.filePath, path.sep), e)
  );

  // todo clear cache on project close
  if (!webpackCache[primaryCodeEntry.id]) {
    const fsContext: LazyReadFileContext = {
      fetchCodeEntry,
      codeEntriesMap,
      savedCodeRevisions: {},
    };

    const options = await webpackConfigFactory(
      {
        deps: nativeDeps,
        depPaths: nativeDepsPaths,
        config,
        pluginEvalDirectory,
      },
      primaryCodeEntry,
      onProgress
    );

    const compiler = webpack(options);
    const volume = new memfs.Volume();
    const inputFs = memfs.createFsFromVolume(volume);
    const outputFs = inputFs;
    const ufs1 = new unionfs.Union();
    // bad types
    ufs1.use(fs).use({
      ...inputFs,
      // bad types
      readFile: lazyReadFileFactory(inputFs, fsContext) as any,
    } as any);

    saveFileWithDirs(
      inputFs,
      primaryCodeEntry.filePath,
      primaryCodeEntry.code!
    );

    compiler.inputFileSystem = ufs1;

    // bug in typescript
    (compiler as any).outputFileSystem = {
      join: joinPath,
      ...outputFs,
    };

    // stub out compiler.watch so that webpack-dev-server doesn't call it and instead relies on the manual compiler.run calls made below
    // @ts-expect-error todo fix types?
    compiler.watch = () => ({ close() {}, invalidate() {} });

    const devServer = new WebpackDevServer(
      {
        allowedHosts: "all",
        compress: true,
        hot: !config.disableFastRefresh,
        webSocketServer: "ws",
        // sockHost,
        // sockPath,
        // sockPort,
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
        devMiddleware: {
          // @ts-expect-error bad types
          outputFileSystem: compiler.outputFileSystem,
          // publicPath: paths.publicUrlOrPath.slice(0, -1),
          publicPath: "/",
        },
        static: {
          // publicPath: paths.publicUrlOrPath,
          directory: path.resolve(config.paths.projectFolder, "public"),
          // todo fix hmr behavior for non-source code assets
          // watch: true,
        },
        client: {
          logging: "none",
        },
      },
      compiler
    );

    // run any plugins that modify WebpackDevServer
    config.pluginEvals.webpackDevServer.forEach((modifier) => {
      try {
        const override = requireFromString(
          modifier.code,
          path.join(
            pluginEvalDirectory,
            `${modifier.name}-webpack-dev-override.js`
          )
        );
        override(devServer);
      } catch (e) {
        console.error(e);
      }
    });

    // launch WebpackDevServer
    await devServer.start();
    const devport = devServer.options.port! as number;
    console.log("dev server listening", devServer.server?.address());

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
      resolve(devport);
    });
  }).finally(() => {
    webpackCache[primaryCodeEntry.id]!.lastPromise = undefined;
  });
  webpackCache[primaryCodeEntry.id]!.lastPromise = runPromise;
  return runPromise;
};

function cleanUpConfig(val: unknown): unknown {
  if (typeof val !== "object" || val === null) return val;
  if (isArray(val)) return val.map((v) => cleanUpConfig(v));

  const clazz = get(val, "constructor.name");
  if (clazz === "RegExp") return val.toString();
  if (clazz && !["Object"].includes(clazz)) return `[${clazz}]`;

  forOwn(val, (v, k) => {
    (val as any)[k] = cleanUpConfig(v);
  });
  return val;
}

export const dumpWebpackConfig = async (
  config: WebpackWorkerMessagePayload_Compile["config"]
) => {
  const options = await webpackConfigFactory(
    {
      deps: nativeDeps,
      depPaths: nativeDepsPaths,
      config,
      pluginEvalDirectory,
    },
    {
      id: "dumpWebpackConfig",
      filePath: "target.tsx",
      code: undefined,
    },
    () => undefined,
    true
    // todo more properly forward this error
  ).catch((e) => e.toString() + "\n" + e.stack);

  return JSON.parse(JSON.stringify(cleanUpConfig(options)));
};
