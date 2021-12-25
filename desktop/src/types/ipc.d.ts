import "electron";

export interface WebpackRendererMessagePayload_PercentUpdate {
  type: "percent-update";
  compileId: number;
  percentage: number;
  message: string;
}

export interface WebpackRendererMessagePayload_CompileFinished {
  type: "compile-finished";
  compileId: number;
  result: number | null;
}

export type WebpackRendererMessagePayload =
  | WebpackRendererMessagePayload_PercentUpdate
  | WebpackRendererMessagePayload_CompileFinished;

export interface WebpackWorkerMessagePayload_Initialize {
  action: "initialize";
  nodeModulesPath: string;
}

export interface WebpackWorkerMessagePayload_Compile {
  action: "compile";
  codeEntries: {
    id: string;
    filePath: string;
    code: string | undefined;
    codeRevisionId: number;
  }[];
  selectedCodeId: string;
  compileId: number;
  paths: {
    projectFolder: string;
    projectSrcFolder: string;
    overrideWebpackConfig: string | undefined;
    htmlTemplate: string;
  };
}

export type WebpackWorkerMessagePayload =
  | WebpackWorkerMessagePayload_Initialize
  | WebpackWorkerMessagePayload_Compile;

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
  }
}
