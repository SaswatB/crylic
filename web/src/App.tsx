import React, { useContext, useEffect, useRef, useState } from "react";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import { Backdrop, CircularProgress } from "@material-ui/core";
import { useSnackbar } from "notistack";
import { Resizable } from "re-resizable";
import { useBus } from "ts-bus/react";

import { OverlayComponentView } from "synergy/src/components/ComponentView/OverlayComponentView";
import { IconButton } from "synergy/src/components/IconButton";
import { AssetTreePane } from "synergy/src/components/SideBar/AssetTreePane";
import { ElementEditorPane } from "synergy/src/components/SideBar/ElementEditorPane";
import { OutlinePane } from "synergy/src/components/SideBar/OutlinePane";
import { Toolbar } from "synergy/src/components/Toolbar";
import { Tour, TourContext } from "synergy/src/components/Tour/Tour";
import { TransformContainer } from "synergy/src/components/TransformContainer";
import { InstallDialog } from "synergy/src/components/Workspace/InstallDialog";
import { useProjectRecoil } from "synergy/src/hooks/recoil/useProjectRecoil/useProjectRecoil";
import { useMenuInput } from "synergy/src/hooks/useInput";
import { editorResize } from "synergy/src/lib/events";
import { Project } from "synergy/src/lib/project/Project";
import { ComponentViewZoomAction } from "synergy/src/types/paint";

import { remoteWebpackWorker } from "./lib/remote-webpack-worker";
import "./App.scss";

function App() {
  const { project, setProject, closeProject } = useProjectRecoil();
  const { enqueueSnackbar } = useSnackbar();
  const bus = useBus();
  const [loading, setLoading] = useState(0);

  const renderIntro = () => (
    <div className="btngrp-v w-full">
      <button
        className="btn w-full"
        data-tour="new-project"
        onClick={() => {
          // todo do
        }}
      >
        New Project
      </button>
      <Tour
        name="new-project"
        beaconStyle={{
          marginTop: -8,
          marginLeft: 10,
        }}
      >
        Crylic is project based, so to get started you will need to either
        create a new project or open an existing one. <br />
        <br />
        Try creating a new project to start!
        <br />
        Existing React projects can also be opened, ones created with
        create-react-app work the best.
      </Tour>
      <button
        className="btn w-full"
        onClick={() => {
          // todo do
        }}
      >
        Open Project
      </button>
    </div>
  );

  const { tourDisabled, setTourDisabled, resetTour } = useContext(TourContext);
  const [
    ,
    renderSettingsMenu,
    openSettingsMenu,
    closeSettingsMenu,
  ] = useMenuInput({
    options: [
      { name: "Save Project", value: "save" },
      { name: "Close Project", value: "close" },
      {
        name: tourDisabled ? "Enable Tour" : "Disable Tour",
        value: "toggleTour",
      },
      !tourDisabled && { name: "Restart Tour", value: "restartTour" },
    ].filter((o): o is { name: string; value: string } => !!o),
    disableSelection: true,
    onChange: (value) => {
      closeSettingsMenu();
      switch (value) {
        case "save":
          try {
            project?.saveFiles();
            enqueueSnackbar("Files Saved!");
          } catch (error) {
            alert(`There was an error while saving: ${error.message}`);
          }
          break;
        case "close":
          closeProject();
          break;
        case "toggleTour":
          setTourDisabled(!tourDisabled);
          break;
        case "restartTour":
          resetTour();
          break;
      }
    },
  });

  const renderLeftPane = (project: Project) => (
    <>
      <div className="flex">
        {project.config.name}
        <div className="flex-1" />
        <IconButton
          className="ml-2"
          title="Settings"
          icon={faBars}
          onClick={openSettingsMenu}
        />
        {renderSettingsMenu()}
      </div>
      <OutlinePane />
      <Resizable
        minHeight={100}
        defaultSize={{ height: 225, width: "auto" }}
        enable={{ top: true }}
        onResizeStop={() => bus.publish(editorResize())}
      >
        {/* todo implement */}
        <AssetTreePane onImportImageFile={async () => null} />
      </Resizable>
    </>
  );

  const [zoomAction, setZoomAction] = useState<ComponentViewZoomAction>();
  useEffect(() => {
    if (zoomAction) setZoomAction(undefined);
  }, [zoomAction]);

  const scaleRef = useRef(1);
  const renderComponentViews = () =>
    project?.renderEntries.map((entry) => (
      <OverlayComponentView
        key={entry.id}
        compilerProps={{
          renderEntry: entry,
          compiler: { deploy: remoteWebpackWorker },
          onNewPublishUrl(url) {
            // todo implement
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
      <Backdrop open={loading > 0}>
        <CircularProgress disableShrink />
      </Backdrop>
      <InstallDialog />
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
            {renderLeftPane(project)}
          </Resizable>
        )}
        <div className="flex flex-col flex-1 relative bg-gray-600 items-center justify-center overflow-hidden">
          {project && (project?.renderEntries.length ?? 0) > 0 && (
            <div className="toolbar flex absolute top-0 right-0 left-0 bg-gray-800 z-10">
              <Toolbar setZoomAction={setZoomAction} />
            </div>
          )}
          {!project && (
            <div className="flex flex-1 w-64 absolute items-center justify-center z-10">
              {renderIntro()}
            </div>
          )}
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
        {/* todo enable */}
        {/* {project && project.editEntries.length > 0 && (
          <Resizable
            minWidth={200}
            maxWidth={1200}
            defaultSize={{ height: "100vh", width: 400 }}
            enable={{ left: true }}
            onResizeStop={() => bus.publish(editorResize())}
          >
            <CodeEditorPane />
          </Resizable>
        )} */}
      </div>
    </div>
  );
}

export default App;
