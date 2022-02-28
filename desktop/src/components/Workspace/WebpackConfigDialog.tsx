import React, { useEffect, useState, VoidFunctionComponent } from "react";
import { useAsyncCallback } from "react-async-hook";
import MonacoEditor from "react-monaco-editor";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@material-ui/core";
import { useSnackbar } from "notistack";

import { useDebouncedFunction } from "synergy/src/hooks/useDebouncedFunction";
import { useProject } from "synergy/src/services/ProjectService";

import { dumpWebpackConfigWithWorker } from "../../utils/compilers/run-code-webpack-worker";

const fs = __non_webpack_require__("fs") as typeof import("fs");

// lm_29b4a7c964 editor height based on content
// lm_86a5543abc reference to overrideConfig.path
const exampleCrylicConfig = `
module.exports = {
  webpack: {
    overrideConfig: {
      path: 'crylic-webpack-override.js',
    }
  }
};
`.trim();

const exampleWebpackConfig = `
/**
 * Webpack override function for Crylic
 * 
 * @param {import('webpack').Configuration} config Webpack config generated by Crylic
 * @param {import('webpack')} webpack Instance of Webpack
 * @returns {import('webpack').Configuration} Modified webpack config
 */
module.exports = function (options, webpack) {
  return options
};
`.trim();

export const WebpackConfigDialog: VoidFunctionComponent<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const project = useProject();
  const { enqueueSnackbar } = useSnackbar();
  const webpackConfig = useAsyncCallback(dumpWebpackConfigWithWorker);
  const webpackOverridePath = project.config.getFullOverrideWebpackPath();
  const [webpackOverride, setWebpackOverride] = useState(exampleWebpackConfig);
  const [webpackOverrideOriginal, setWebpackOverrideOriginal] = useState<
    string
  >();
  const madeChanges =
    webpackOverrideOriginal !== undefined &&
    webpackOverride !== webpackOverrideOriginal;

  useEffect(() => {
    let currentWebpackOverride;
    if (webpackOverridePath) {
      currentWebpackOverride = fs.readFileSync(webpackOverridePath, "utf8");
      if (currentWebpackOverride) {
        setWebpackOverride(currentWebpackOverride);
        setWebpackOverrideOriginal(currentWebpackOverride);
      }
    }
    void webpackConfig.execute(project);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  useEffect(() => {
    if (!open && madeChanges) {
      setWebpackOverrideOriginal(undefined);
      enqueueSnackbar(
        "To use the updated webpack configuration, please reopen the project",
        { variant: "warning" }
      );
    }
  }, [enqueueSnackbar, madeChanges, open]);

  const refreshWebpackConfig = useDebouncedFunction((newOverride) => {
    if (!webpackOverridePath) return;
    fs.writeFileSync(webpackOverridePath, newOverride);
    void webpackConfig.execute(project);
  }, 1000);

  const updateWebpackOverride = (newOverride: string) => {
    setWebpackOverride(newOverride);
    refreshWebpackConfig(newOverride);
  };

  return (
    // todo this onClose should undo changes
    <Dialog open={open} onClose={onClose} maxWidth="xl">
      <DialogTitle>Webpack Configuration</DialogTitle>
      <DialogContent
        className="flex flex-col"
        // todo fix weird layout issues
        style={{ width: "90vw", height: webpackOverridePath ? "90vh" : "" }}
      >
        <div className="flex-1 mb-4">
          <MonacoEditor
            language="json"
            theme="darkVsPlus"
            value={
              webpackConfig
                ? JSON.stringify(webpackConfig.result, null, 4)
                : "loading..."
            }
            options={{ automaticLayout: true, wordWrap: "on" }}
          />
        </div>
        {webpackOverridePath ? (
          <div>
            <h2>Override File:</h2>
            <div style={{ height: "25vh" }}>
              {/* todo add types */}
              <MonacoEditor
                language="javascript"
                theme="darkVsPlus"
                value={webpackOverride}
                options={{ automaticLayout: true, wordWrap: "on" }}
                onChange={(v) => updateWebpackOverride(v)}
              />
            </div>
          </div>
        ) : (
          // todo automate
          <div>
            <h2>To override this config follow these steps:</h2>
            <ul>
              <li>
                {">"} Create an empty file named{" "}
                <code>crylic-webpack-override.js</code>
              </li>
              <li>
                {">"} Create a file named{" "}
                <code>crylic.config.js with the below content</code>
              </li>
              <li>{">"} Reopen the project</li>
            </ul>
            <br />
            <MonacoEditor
              // lm_29b4a7c964 height based on content
              // from editor.getContentHeight()
              height={133}
              language="javascript"
              theme="darkVsPlus"
              value={exampleCrylicConfig}
              options={{ wordWrap: "on", scrollBeyondLastLine: false }}
            />
          </div>
        )}
      </DialogContent>
      <DialogActions>
        {webpackOverridePath ? (
          <>
            <Button
              onClick={() => {
                madeChanges && updateWebpackOverride(webpackOverrideOriginal);
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => onClose()} color="primary">
              Save
            </Button>
          </>
        ) : (
          <Button onClick={() => onClose()}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
