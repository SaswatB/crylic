import React from "react";
import ReactDOMServer from "react-dom/server";

import { ErrorBoundary } from "synergy/src/components/ErrorBoundary";
import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { Project } from "synergy/src/lib/project/Project";
import {
  RenderEntry,
  RenderEntryDeployerContext,
} from "synergy/src/lib/project/RenderEntry";
import { findFiber } from "synergy/src/lib/react-dev-tools";
import {
  generateRenderStarter,
  RenderStarterDefinition,
} from "synergy/src/lib/render-starter";
import { isDefined, ltTakeNext } from "synergy/src/lib/utils";
import { PluginService } from "synergy/src/services/PluginService";
import { ReactDevToolsHook } from "synergy/src/types/react-devtools";

import {
  WebpackRendererMessagePayload_CompileFinished,
  WebpackRendererMessagePayload_PercentUpdate,
  WebpackWorkerMessagePayload_Compile,
} from "../../types/ipc";
import { publishComponent, unpublishComponent } from "../publish-component";
import { getAppNodeModules } from "../utils";
import { reactDevToolsFactory } from "./helpers/react-dev-tools-factory";
import {
  dumpWebpackConfig,
  resetWebpack,
  webpackRunCode,
} from "./run-code-webpack";

import errorBoundaryComponent from "!!raw-loader!synergy/src/components/ErrorBoundary";

const fs = __non_webpack_require__("fs") as typeof import("fs");

const { ipcRenderer } = __non_webpack_require__(
  "electron"
) as typeof import("electron");

const HMR_STATUS_HANDLER_PROP = "__crylicHmrStatusHandler";
const ROOT_COMPONENT_PROP = "__crylicComponentRoot";
const WORKER_ENABLED = true;

const progressCallbacks: Record<
  number,
  (data: WebpackRendererMessagePayload_PercentUpdate) => void
> = {};
const compileCallbacks: Record<
  number,
  (data: WebpackRendererMessagePayload_CompileFinished) => void
> = {};

if (WORKER_ENABLED) {
  // start the worker
  console.log("starting webpack worker");
  ipcRenderer.on("webpack-renderer-message", (e, data) => {
    switch (data.type) {
      case "percent-update":
        progressCallbacks[data.compileId]?.(data);
        break;
      case "compile-finished":
        compileCallbacks[data.compileId]?.(data);
        break;
    }
  });
  // initialize the worker with the local node modules
  ipcRenderer.send("webpack-worker-message", {
    action: "initialize",
    nodeModulesPath: getAppNodeModules(),
  });
}

const getImportFromCodeEntry = async (local: string, codeEntry: CodeEntry) => {
  const exportIsDefault = await ltTakeNext(codeEntry.exportIsDefault$);
  const exportName = await ltTakeNext(codeEntry.exportName$);

  let declaration;
  if (exportIsDefault || !exportName) {
    declaration = local;
  } else if (exportName === local) {
    declaration = `{ ${local} }`;
  } else {
    declaration = `{ ${exportName} as ${local} }`;
  }

  // todo is there any benefit to a relative path here instead of absolute?
  const src = codeEntry.filePath.getNativePath().replace(/\\/g, "\\\\");
  return `import ${declaration} from "${src}";`;
};

const generateBundleCode = async (
  project: Project,
  renderEntry: RenderEntry,
  pluginService: PluginService
) => {
  const componentImport = await getImportFromCodeEntry(
    "Component",
    renderEntry.codeEntry
  );

  // get the bootstrap file
  let bootstrapImport = undefined;
  const bootstrapFilePath = project.config.getBootstrapPath();
  if (bootstrapFilePath) {
    let bootstrapCodeEntry = project.codeEntries$
      .getValue()
      .find((c) => c.isBootstrap());
    if (!bootstrapCodeEntry) {
      // todo is there a better way?
      bootstrapCodeEntry = new CodeEntry(
        project,
        bootstrapFilePath,
        fs.readFileSync(bootstrapFilePath.getNativePath(), {
          encoding: "utf-8",
        })
      );
      project.addCodeEntries([bootstrapCodeEntry]);
    }
    bootstrapImport = await getImportFromCodeEntry(
      "Bootstrap",
      bootstrapCodeEntry
    );
  }

  const def: RenderStarterDefinition = {
    imports: [
      'import React, { ErrorInfo } from "react";',
      'import ReactDOM from "react-dom";',
      ...(bootstrapImport ? [bootstrapImport] : []),
      componentImport,
    ],
    beforeRender: [
      errorBoundaryComponent
        .replace('import React, { ErrorInfo } from "react";', "")
        .replace("export", ""),
      `try {
        Component.${ROOT_COMPONENT_PROP} = true
      } catch (e) {}`,
    ],
    render: {
      root: project.config.getHtmlTemplateSelector(),
      errorWrapper: "ErrorBoundary",
      wrappers: bootstrapImport
        ? [
            {
              open: "Bootstrap Component={Component} pageProps={{}}",
              close: "Bootstrap",
            },
          ]
        : [],
      componentProps: Object.entries(
        renderEntry.componentProps$.getValue()
      ).map(([k, v]) =>
        `${k}={${JSON.stringify(v, (_key, val) =>
          typeof val === "function" ? "[function]" : val
        )}}`.replaceAll(`"[function]"`, `() => void 0`)
      ),
    },
    afterRender: [
      `if ((module || {}).hot && (window || {}).${HMR_STATUS_HANDLER_PROP}) {
        module.hot.addStatusHandler(window.${HMR_STATUS_HANDLER_PROP});
      }`,
    ],
  };

  return generateRenderStarter(
    pluginService.reduceActive((d, p) => p.overrideRenderStarter(d), def)
  );
};

const generateJobConfig = (
  project: Project,
  pluginService: PluginService
): WebpackWorkerMessagePayload_Compile["config"] => ({
  disableWebpackExternals:
    project.config.configFile?.webpack?.overrideConfig
      ?.disableExternalsInjection,
  disableReactExternals: project.config.getPackageManager().hasDepsInstalled(),
  disableFastRefresh:
    project.config.configFile?.webpack?.overrideConfig?.disableFastRefresh,
  disableSWC: project.config.configFile?.webpack?.overrideConfig?.disableSWC,
  enableReactRuntimeCompat: project.config.isReactOverV17(),
  disablePolyfills:
    project.config.configFile?.webpack?.overrideConfig?.disablePolyfills,
  paths: {
    projectFolder: project.path.getNativePath(),
    overrideWebpackConfig: project.config
      .getFullOverrideWebpackPath()
      ?.getNativePath(),
    htmlTemplate: project.config.getFullHtmlTemplatePath().getNativePath(),
  },
  pluginEvals: {
    webpack: pluginService
      .mapActive((p) => {
        const code = p.overrideWebpackConfig();
        return code ? { name: p.constructor.name, code } : undefined;
      })
      .filter(isDefined),
    webpackDevServer: pluginService
      .mapActive((p) => {
        const code = p.overrideWebpackDevServer();
        return code ? { name: p.constructor.name, code } : undefined;
      })
      .filter(isDefined),
  },
});

let compileIdCounter = 0;

/**
 * Runs `webpackRunCode` on a worker
 */
export const webpackRunCodeWithWorker = async ({
  project,
  pluginService,
  renderEntry,
  frame,
  onPublish,
}: RenderEntryDeployerContext) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;
  const bundleCodeEntry = {
    id: `bundle-${renderEntry.codeId}`,
    code: await generateBundleCode(project, renderEntry, pluginService),
    filePath: project.path.join("paintbundle.tsx").getNativePath(),
  };

  const trimEntry = async (codeEntry: CodeEntry) => ({
    id: codeEntry.id,
    filePath: codeEntry.filePath.getNativePath(),
    codeRevisionId: codeEntry.codeRevisionId,
  });
  const codeEntries = await Promise.all(
    project.codeEntries$.getValue().map(trimEntry)
  );
  console.log("compiling codeEntries", codeEntries);

  const config = generateJobConfig(project, pluginService);
  console.log("webpack job config", config);

  const takeNextCode = async (codeEntryId: string) => {
    const codeEntry = project.getCodeEntryValue(codeEntryId);
    console.log("takeNextCode", codeEntry);
    return codeEntry
      ? (await ltTakeNext(codeEntry.codeWithLookupData$)) ||
          codeEntry.code$.getValue()
      : undefined;
  };
  const onProgress = (payload: { percentage: number; message: string }) =>
    renderEntry.compileProgress$.next(payload);

  let devport: number | null;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    const workerCallback = new Promise<{ result: number | null }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
    progressCallbacks[compileId] = onProgress;

    const codeFetchHandler = async (
      _: unknown,
      d: { type: string; codeEntryId: string }
    ) => {
      if (d.type !== "code-request") return;

      ipcRenderer.send("webpack-renderer-message-" + d.codeEntryId, {
        action: "code-response",
        code: await takeNextCode(d.codeEntryId),
      });
    };
    ipcRenderer.on("webpack-renderer-message", codeFetchHandler);

    // set a message to the worker for compiling code
    ipcRenderer.send("webpack-worker-message", {
      action: "compile",
      codeEntries,
      primaryCodeEntry: bundleCodeEntry,
      compileId,
      config,
    });

    // wait for the worker to compile
    ({ result: devport } = await workerCallback);

    ipcRenderer.off("webpack-renderer-message", codeFetchHandler);
    delete compileCallbacks[compileId];
    delete progressCallbacks[compileId];
  } else {
    devport = await webpackRunCode(
      codeEntries,
      bundleCodeEntry,
      config,
      onProgress,
      (codeEntryId) => takeNextCode(codeEntryId)
    );
  }

  const workerCallbackTime = Date.now();

  frame!.onload = () => {
    console.log("frame onload");
    const frameWindow = frame!.contentWindow! as Window & {
      paintErrorDisplayed?: boolean;
      require?: (module: string) => unknown;
      exports?: unknown;
      [HMR_STATUS_HANDLER_PROP]?: (status: string) => void;
      __REACT_DEVTOOLS_GLOBAL_HOOK__?: Partial<ReactDevToolsHook>;
      paintBundle?: () => void;
    };

    if (frameWindow.paintBundle === undefined) {
      console.error("frame has no bundle");
      return;
    }

    const errorHandler = (error: Error) => {
      const body = frame!.contentDocument!.querySelector("body")!;
      body.style.margin = "0px";
      body.innerHTML = ReactDOMServer.renderToStaticMarkup(
        React.createElement(ErrorBoundary, { error })
      );
      frameWindow.paintErrorDisplayed = true;
      return true;
    };
    frameWindow.addEventListener("error", (e) => errorHandler(e.error));

    // run the resulting bundle on the provided iframe, with stubs
    frameWindow.exports = {};
    let hasHmrApplied = false;
    // listener for HMR updates
    frameWindow[HMR_STATUS_HANDLER_PROP] = (status) => {
      if (status === "apply") hasHmrApplied = true;
      else if (status === "idle" && hasHmrApplied) {
        // run the callback on an idle after an apply
        hasHmrApplied = false;
        renderEntry.viewReloadedStart$.next();
        // todo try to avoid timeout
        setTimeout(() => renderEntry.viewReloaded$.next(), 100);
      }
    };

    frameWindow.__REACT_DEVTOOLS_GLOBAL_HOOK__ = reactDevToolsFactory(
      (root) => {
        renderEntry.reactMetadata$.next({
          fiberRoot: root,
          get fiberComponentRoot() {
            const componentRoot = findFiber(
              root.current,
              (fiber) =>
                fiber.type?.[ROOT_COMPONENT_PROP] ||
                fiber.elementType?.[ROOT_COMPONENT_PROP]
            );
            return componentRoot || root.current;
          },
        });
      }
    );
    renderEntry.viewReloadedStart$.next();

    try {
      frameWindow.paintBundle();
    } catch (error) {
      errorHandler(error as Error);
    }
    delete frameWindow[HMR_STATUS_HANDLER_PROP];
    delete frameWindow.exports;
    // devtools hook is purposely not deleted
    renderEntry.viewReloaded$.next();
  };
  if (
    // todo fix tiny edge case where 'includes' here has a false positive
    !frame!.contentWindow!.location.href.includes(`${devport}`) ||
    (frame!.contentWindow! as any).paintErrorDisplayed
  ) {
    frame!.contentWindow!.location.href = `http://localhost:${devport}/`;
    console.log("refreshing iframe");
  }

  // todo fix
  // if (renderEntry.publish) {
  //   const url = await publishComponent(renderEntry.codeId, bundle!);
  //   console.log("published:", url);
  //   onPublish(url);
  // } else {
  //   unpublishComponent(renderEntry.codeId);
  // }

  const endCallbackTime = Date.now();

  console.log(
    "webpackRunCodeWithWorker times",
    endCallbackTime - startTime,
    endCallbackTime - workerCallbackTime,
    workerCallbackTime - startTime
  );
};

export const resetWebpackWithWorker = () => {
  if (WORKER_ENABLED)
    ipcRenderer.send("webpack-worker-message", { action: "reset" });
  else resetWebpack();
};

export const dumpWebpackConfigWithWorker = async (
  project: Project,
  pluginService: PluginService
) => {
  const config = generateJobConfig(project, pluginService);

  if (WORKER_ENABLED) {
    return ipcRenderer.invoke("webpack-worker-message-dump-config", config);
  } else {
    return dumpWebpackConfig(config);
  }
};
