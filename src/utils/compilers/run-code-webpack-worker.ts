import WebpackWorker from "worker-loader!./webpack-worker";

import { Project } from "../../lib/project/Project";
import { CodeEntry, RenderEntry } from "../../types/paint";
import { DEFAULT_HTML_TEMPLATE_SELECTOR } from "../constants";
import { publishComponent, unpublishComponent } from "../publish-component";
import { getReactRouterProxy, RouteDefinition } from "../react-router-proxy";
import { webpackRunCode } from "./run-code-webpack";

const path = __non_webpack_require__("path") as typeof import("path");

const WORKER_ENABLED = true;

let worker: WebpackWorker;
const progressCallbacks: Record<number, Function> = {};
const compileCallbacks: Record<number, Function> = {};
if (WORKER_ENABLED) {
  // start the worker
  console.log("starting webpack worker");
  worker = new WebpackWorker();
  worker.onmessage = (e) => {
    switch (e.data.type) {
      case "percent-update":
        progressCallbacks[e.data.compileId]?.(e.data);
        break;
      case "compile-finished":
        compileCallbacks[e.data.compileId]?.(e.data);
        break;
    }
  };
  // initialize the worker with the local node modules
  worker.postMessage({
    action: "initialize",
    nodeModulesPath: __non_webpack_require__
      .resolve("webpack")
      .replace(
        /node_modules[/\\].*$/,
        `${
          process.env.NODE_ENV === "development" ? `app${path.sep}` : ""
        }node_modules${path.sep}`
      ),
  });
}

let compileIdCounter = 0;

interface RunnerContext {
  frame: HTMLIFrameElement | undefined;
  onProgress: (arg: { percentage: number; message: string }) => void;
  onPublish: (url: string) => void;
  onReload: () => void;

  // react router support
  onSwitchActive: (switchId: string, arg: RouteDefinition) => void;
  onSwitchDeactivate: (switchId: string) => void;
  onRouteActive: (routeId: string, route: string) => void;
  onRouteDeactivate: (routeId: string) => void;
}

/**
 * Runs `webpackRunCode` on a worker
 */
export const webpackRunCodeWithWorker = async (
  project: Project,
  renderEntry: RenderEntry,
  {
    frame,
    onProgress,
    onPublish,
    onReload,
    onSwitchActive,
    onSwitchDeactivate,
    onRouteActive,
    onRouteDeactivate,
  }: RunnerContext
) => {
  const startTime = Date.now();
  const compileId = ++compileIdCounter;

  const getImport = (declaration: string, source: string) =>
    `import ${declaration} from "${source.replace(/\\/g, "\\\\")}";`;
  const getImportFromCodeEntry = (local: string, codeEntry: CodeEntry) =>
    getImport(
      codeEntry.exportIsDefault || !codeEntry.exportName
        ? local
        : codeEntry.exportName === local
        ? `{ ${local} }`
        : `{ ${codeEntry.exportName} as ${local} }`,
      codeEntry.filePath
    );
  const componentImport = getImportFromCodeEntry(
    "Component",
    project.getCodeEntry(renderEntry.codeId)!
  );
  const bootstrapCodeEntry = project.codeEntries.find((c) => c.isBootstrap);
  const bootstrapImport = bootstrapCodeEntry
    ? getImportFromCodeEntry("Bootstrap", bootstrapCodeEntry)
    : "";

  const bundleCode = `
import React from "react";
import ReactDOM from "react-dom";
${componentImport}
${bootstrapImport}

ReactDOM.render(
  ${
    bootstrapCodeEntry
      ? `(<Bootstrap>
    <Component />
  </Bootstrap>)`
      : `<App />`
  },
  document.getElementById("${
    project.config.configFile?.htmlTemplate?.rootSelector ||
    DEFAULT_HTML_TEMPLATE_SELECTOR
  }")
);
`;
  console.log("bundleCode", bundleCode);

  const bundleId = `bundle-${renderEntry.codeId}`;
  const codeEntries = project.codeEntries
    .map((codeEntry) => ({
      id: codeEntry.id,
      filePath: codeEntry.filePath,
      code: codeEntry.codeWithLookupData || codeEntry.code,
      codeRevisionId: codeEntry.codeRevisionId,
    }))
    .concat([
      {
        id: bundleId,
        code: bundleCode,
        // todo add random string to filename
        filePath: path.join(project.sourceFolderPath, "paintbundle.jsx"),
        codeRevisionId: 0,
      },
    ]);

  const paths = {
    projectFolder: project.path,
    projectSrcFolder: project.sourceFolderPath,
    overrideWebpackConfig: project.config.getFullOverrideWebpackPath(),
    htmlTemplate: project.config.getFullHtmlTemplatePath(),
  };

  let devport;
  if (WORKER_ENABLED) {
    // register a callback for then the worker completes
    const workerCallback = new Promise<{ result: number }>((resolve) => {
      compileCallbacks[compileId] = resolve;
    });
    progressCallbacks[compileId] = onProgress;

    // set a message to the worker for compiling code
    worker.postMessage({
      action: "compile",
      codeEntries,
      selectedCodeId: bundleId,
      compileId,
      paths,
    });

    // wait for the worker to compile
    ({ result: devport } = await workerCallback!);

    delete compileCallbacks[compileId];
    delete progressCallbacks[compileId];
  } else {
    devport = await webpackRunCode(codeEntries, bundleId, paths, onProgress);
  }

  const workerCallbackTime = Date.now();

  frame!.onload = () => {
    console.log("frame onload");
    // run the resuulting bundle on the provided iframe, with stubs
    (frame!.contentWindow! as any).require = (name: string) => {
      if (name === "react") return require("react");
      if (name === "react-dom") return require("react-dom");
      if (name === "react-router-dom")
        return getReactRouterProxy(
          frame!.contentWindow!,
          onSwitchActive,
          onSwitchDeactivate,
          onRouteActive,
          onRouteDeactivate
        );
      if (name === "react-refresh/runtime")
        return __non_webpack_require__("react-refresh/runtime");
      if (name === "normalize.css") return {};
      throw new Error(`Unable to require "${name}"`);
    };
    (frame!.contentWindow! as any).exports = {};
    (frame!.contentWindow! as any).paintBundle();
    delete (frame!.contentWindow! as any).exports;
    delete (frame!.contentWindow! as any).require;
    onReload();
  };
  if (!frame!.contentWindow!.location.href.includes(`${devport}`))
    frame!.contentWindow!.location.href = `http://localhost:${devport}/`;

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
