import "electron";

export interface WebpackRendererMessagePayload_PercentUpdate {
  type: "percent-update";
  compileId: number;
  percentage: number;
  message: string;
}

export interface WebpackRendererMessagePayload_CodeEntryRequest {
  type: "code-request";
  compileId: number;
  codeEntryId: string;
}

export interface WebpackRendererMessagePayload_CompileFinished {
  type: "compile-finished";
  compileId: number;
  result: number | null;
}

export type WebpackRendererMessagePayload =
  | WebpackRendererMessagePayload_PercentUpdate
  | WebpackRendererMessagePayload_CodeEntryRequest
  | WebpackRendererMessagePayload_CompileFinished;

export interface WebpackWorkerMessagePayload_Initialize {
  action: "initialize";
  nodeModulesPath: string;
}

export interface WebpackWorkerMessagePayload_Reset {
  action: "reset";
}

export interface WebpackWorkerMessagePayload_Compile {
  action: "compile";
  codeEntries: {
    id: string;
    filePath: string;
    codeRevisionId: number;
  }[];
  primaryCodeEntry: {
    id: string;
    filePath: string;
    code: string | undefined;
  };
  compileId: number;
  config: {
    paths: {
      projectFolder: string; // appPath
      overrideWebpackConfig: string | undefined;
      htmlTemplate: string;
    };
    disableWebpackExternals?: boolean;
    disableFastRefresh?: boolean;
    disableSWC?: boolean;
    disableReactExternals?: boolean;
    enableReactRuntimeCompat?: boolean; // needed to React 17+
    disablePolyfills?: boolean;
    pluginEvals: {
      webpack: { name: string; code: string }[];
      webpackDevServer: { name: string; code: string }[];
    };
  };
}

export type WebpackWorkerMessagePayload =
  | WebpackWorkerMessagePayload_Initialize
  | WebpackWorkerMessagePayload_Reset
  | WebpackWorkerMessagePayload_Compile;

interface RuntimeInfo {
  dirname: string;
  execPath: string;
}

declare module "electron" {
  interface IpcRenderer {
    on(
      channel: "webpack-renderer-message",
      listener: (
        event: IpcRendererEvent,
        data: WebpackRendererMessagePayload
      ) => void
    ): this;
    send(
      channel: "webpack-worker-message",
      data: WebpackWorkerMessagePayload
    ): void;
    invoke(channel: "runtimeInfo"): Promise<RuntimeInfo>;
    invoke(
      channel: "showOpenDialog",
      options: OpenDialogOptions
    ): Promise<OpenDialogReturnValue>;
    invoke(
      channel: "showSaveDialog",
      options: SaveDialogOptions
    ): Promise<SaveDialogReturnValue>;
  }

  interface IpcMain {
    on(
      channel: "webpack-worker-message",
      listener: (
        event: IpcRendererEvent,
        data: WebpackWorkerMessagePayload
      ) => void
    ): this;
    send(
      channel: "webpack-renderer-message",
      data: WebpackRendererMessagePayload
    ): void;
    handle(
      channel: "runtimeInfo",
      listener: (event: IpcMainInvokeEvent) => RuntimeInfo
    ): void;
    handle(
      channel: "showOpenDialog",
      listener: (
        event: IpcMainInvokeEvent,
        options: OpenDialogOptions
      ) => Promise<OpenDialogReturnValue>
    ): void;
    handle(
      channel: "showSaveDialog",
      listener: (
        event: IpcMainInvokeEvent,
        options: SaveDialogOptions
      ) => Promise<SaveDialogReturnValue>
    ): void;
  }
}
