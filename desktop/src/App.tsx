import React, { useCallback, useEffect, useRef, useState } from "react";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { useSnackbar } from "notistack";
import { Resizable } from "re-resizable";
import { distinctUntilChanged, map } from "rxjs/operators";
import { useBus } from "ts-bus/react";

import { OverlayComponentView } from "synergy/src/components/ComponentView/OverlayComponentView";
import { IconButton } from "synergy/src/components/IconButton";
import { AssetTreePane } from "synergy/src/components/SideBar/AssetTreePane";
import { ElementEditorPane } from "synergy/src/components/SideBar/ElementEditorPane";
import { OutlinePane } from "synergy/src/components/SideBar/OutlinePane";
import { Toolbar } from "synergy/src/components/Toolbar";
import { Tour } from "synergy/src/components/Tour/Tour";
import { TransformContainer } from "synergy/src/components/TransformContainer";
import { ConfigurationDialog } from "synergy/src/components/Workspace/ConfigurationDialog";
import { InstallDialog } from "synergy/src/components/Workspace/InstallDialog";
import {
  useMemoObservable,
  useObservable,
} from "synergy/src/hooks/useObservable";
import { useObservableCallback } from "synergy/src/hooks/useObservableCallback";
import { editorResize } from "synergy/src/lib/events";
import { useProject } from "synergy/src/services/ProjectService";
import { ComponentViewZoomAction } from "synergy/src/types/paint";

import { CodeEditorPane } from "./components/SideBar/CodeEditorPane/CodeEditorPane";
import { Intro } from "./components/Workspace/Intro";
import { openFilePicker } from "./hooks/useFilePicker";
import { webpackRunCodeWithWorker } from "./utils/compilers/run-code-webpack-worker";
import "./App.scss";

const open = __non_webpack_require__("open") as typeof import("open");

function App() {
  const project = useProject({ allowUndefined: true });
  const { enqueueSnackbar } = useSnackbar();
  const bus = useBus();
  const renderEntries = useObservable(project?.renderEntries$);
  const hasEditEntries = useMemoObservable(
    () =>
      project?.editEntries$.pipe(
        map((editEntries) => (editEntries.length ?? 0) > 0),
        distinctUntilChanged()
      ),
    [project]
  );
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const closeConfigDialog = useCallback(() => setShowConfigDialog(false), []);

  useObservableCallback(project?.projectSaved$, () =>
    enqueueSnackbar("Files Saved!")
  );

  const renderLeftPane = (projectName: string) => (
    <>
      <div className="flex">
        {projectName}
        <div className="flex-1" />
        <IconButton
          className="ml-2"
          title="Settings"
          icon={faCog}
          onClick={() => setShowConfigDialog(true)}
        />
        <ConfigurationDialog
          open={showConfigDialog}
          onClose={closeConfigDialog}
        />
      </div>
      <OutlinePane />
      <Resizable
        minHeight={100}
        defaultSize={{ height: 225, width: "auto" }}
        enable={{ top: true }}
        onResizeStop={() => bus.publish(editorResize())}
        handleStyles={{
          top: {
            top: 16,
            // lm_ca3045309d hardcoded label width
            left: 46,
            // lm_5d160a2bcc hardcoded icon group width
            right: 70,
            width: undefined,
          },
        }}
      >
        <AssetTreePane
          onImportImageFile={() =>
            openFilePicker({
              filters: [
                {
                  name: "Image (.jpg,.jpeg,.png,.gif,.svg)",
                  extensions: ["jpg", "jpeg", "png", "gif", "svg"],
                },
              ],
            })
          }
        />
      </Resizable>
    </>
  );

  const [zoomAction, setZoomAction] = useState<ComponentViewZoomAction>();
  useEffect(() => {
    if (zoomAction) setZoomAction(undefined);
  }, [zoomAction]);

  const scaleRef = useRef(1);
  const renderComponentViews = () =>
    renderEntries?.map((entry) => (
      <OverlayComponentView
        key={entry.id}
        compilerProps={{
          renderEntry: entry,
          compiler: { deploy: webpackRunCodeWithWorker },
          onNewPublishUrl(url) {
            // open a published component in a brower whenever it gets a new url
            open(url);
          },
        }}
        scaleRef={scaleRef}
      />
    ));

  return (
    <div
      className="flex flex-col items-stretch w-screen h-screen relative overflow-hidden text-white"
      data-tour="start"
    >
      {project && <InstallDialog />}
      <Tour
        name="start"
        autoOpen
        disableSpotlight
        beaconStyle={{ position: "fixed", left: "50%", top: 20 }}
      >
        Welcome! <br />
        To help get you started, this tour will guide you through the basics of
        using Crylic. <br />
        <br />
        Look around for beacons to get further instructions.
        <br />
        <br />
        Please note, this application may send reports to the developer if any
        errors occur.
      </Tour>
      <div className="flex flex-1 flex-row">
        {project && (
          <Resizable
            className="flex flex-col p-4 pb-0 h-screen bg-gray-800 z-10"
            minWidth={200}
            maxWidth={800}
            defaultSize={{ height: "100vh", width: 300 }}
            enable={{ right: true }}
          >
            {renderLeftPane(project.config.name)}
          </Resizable>
        )}
        <div className="flex flex-col flex-1 relative bg-gray-600 items-center justify-center overflow-hidden">
          {project && (renderEntries?.length ?? 0) > 0 && (
            <div className="toolbar flex absolute top-0 right-0 left-0 bg-gray-800 z-10">
              <Toolbar setZoomAction={setZoomAction} />
            </div>
          )}
          {!project && <Intro />}
          <TransformContainer
            zoomAction={zoomAction}
            onZoomChange={(scale) => (scaleRef.current = scale)}
          >
            {renderComponentViews()}
          </TransformContainer>
        </div>
        {project && (
          <Resizable
            className="flex flex-col h-screen bg-gray-800 z-10"
            minWidth={200}
            maxWidth={500}
            defaultSize={{ height: "100vh", width: 300 }}
            enable={{ left: true }}
          >
            <ElementEditorPane />
          </Resizable>
        )}
        {hasEditEntries && (
          <Resizable
            minWidth={200}
            maxWidth={1200}
            defaultSize={{ height: "100vh", width: 400 }}
            enable={{ left: true }}
            onResizeStop={() => bus.publish(editorResize())}
          >
            <CodeEditorPane />
          </Resizable>
        )}
      </div>
      {!project && (
        <div
          className="fixed top-0 right-0 p-3 opacity-50"
          title={__COMMIT_HASH__}
        >
          v{__BUILD_VERSION__}
        </div>
      )}
    </div>
  );
}

export default App;
