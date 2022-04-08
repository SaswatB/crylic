import React, { useEffect, useRef, useState } from "react";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { faCog } from "@fortawesome/free-solid-svg-icons";
import { Checkbox } from "@material-ui/core";
import { useSnackbar } from "notistack";
import { Resizable } from "re-resizable";
import { distinctUntilChanged, map } from "rxjs/operators";
import { useBus } from "ts-bus/react";

import { Button } from "synergy/src/components/base/Button";
import {
  DARK_COLOR,
  LIGHT_COLOR,
} from "synergy/src/components/base/design-constants";
import { Flex, Spacer } from "synergy/src/components/base/Flex";
import { OverlayComponentView } from "synergy/src/components/ComponentView/OverlayComponentView";
import { IconButton } from "synergy/src/components/IconButton";
import { AssetTreePane } from "synergy/src/components/SideBar/AssetTreePane";
import { ElementEditorPane } from "synergy/src/components/SideBar/ElementEditorPane";
import { OutlinePane } from "synergy/src/components/SideBar/OutlinePane";
import { SupportCTA } from "synergy/src/components/Support/SupportCTA";
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
import { useService } from "synergy/src/hooks/useService";
import { editorResize } from "synergy/src/lib/events";
import { useProject } from "synergy/src/services/ProjectService";
import { SelectService } from "synergy/src/services/SelectService";
import { ComponentViewZoomAction } from "synergy/src/types/paint";

import { CodeEditorPane } from "./components/SideBar/CodeEditorPane/CodeEditorPane";
import { Intro } from "./components/Workspace/Intro";
import { WebpackConfigDialog } from "./components/Workspace/WebpackConfigDialog";
import { openFilePicker } from "./hooks/useFilePicker";
import {
  resetWebpackWithWorker,
  webpackRunCodeWithWorker,
} from "./utils/compilers/run-code-webpack-worker";
import "./App.scss";

const open = __non_webpack_require__("open") as typeof import("open");

const Store = __non_webpack_require__(
  "electron-store"
) as typeof import("electron-store");
const store = new Store();

export function App() {
  const bus = useBus();
  const { enqueueSnackbar } = useSnackbar();
  const selectService = useService(SelectService);
  const hasSelectedElement = useMemoObservable(
    () =>
      selectService.selectedElement$.pipe(
        map((s) => s !== undefined),
        distinctUntilChanged()
      ),
    [selectService]
  );
  const project = useProject({ allowUndefined: true });
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
  const [showWebpackConfigDialog, setShowWebpackConfigDialog] = useState(false);

  useEffect(() => {
    if (!project) resetWebpackWithWorker();
  }, [project]);

  useObservableCallback(
    project?.projectSaved$,
    () => enqueueSnackbar("Files Saved!"),
    { disableClearOnObservableChange: true }
  );

  const [allowTracking, setAllowTracking] = useState(
    !store.get("tracking_disabled")
  );
  useEffect(() => {
    store.set("tracking_disabled", !allowTracking);
  }, [allowTracking]);

  const renderTrackingConfig = () => (
    <TrackingControlGroup>
      <Checkbox
        checked={allowTracking}
        onChange={(e) => setAllowTracking(e.target.checked)}
      />
      Allow collecting error reports and anonymized usage analytics.
    </TrackingControlGroup>
  );

  const renderLeftPane = (projectName: string) => (
    <>
      <Flex>
        {projectName}
        <Spacer />
        <IconButton
          title="Settings"
          icon={faCog}
          onClick={() => setShowConfigDialog(true)}
        />
        <ConfigurationDialog
          open={showConfigDialog}
          trackingConfigNode={renderTrackingConfig()}
          onClose={() => setShowConfigDialog(false)}
          onEditWebpackConfig={() => setShowWebpackConfigDialog(true)}
        />
        <WebpackConfigDialog
          open={showWebpackConfigDialog}
          onClose={() => setShowWebpackConfigDialog(false)}
        />
      </Flex>
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
    <Container data-tour="start">
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
        {renderTrackingConfig()}
      </Tour>
      <PaneContainer>
        {project && (
          <Resizable
            className={LeftPaneContainer}
            minWidth={200}
            maxWidth={800}
            defaultSize={{ height: "100vh", width: 300 }}
            enable={{ right: true }}
          >
            {renderLeftPane(project.config.name)}
          </Resizable>
        )}
        <WorkspaceContainer>
          {project && (renderEntries?.length ?? 0) > 0 && (
            <ToolbarContainer>
              <Toolbar setZoomAction={setZoomAction} />
            </ToolbarContainer>
          )}
          {!project && <Intro />}
          <TransformContainer
            zoomAction={zoomAction}
            onZoomChange={(scale) => (scaleRef.current = scale)}
          >
            {renderComponentViews()}
          </TransformContainer>
          <SupportCTA openUrl={open} />
        </WorkspaceContainer>
        {project && !!hasSelectedElement && (
          <Resizable
            className={RightPaneContainer}
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
      </PaneContainer>
      {!project && (
        <Version title={__COMMIT_HASH__}>v{__BUILD_VERSION__}</Version>
      )}
    </Container>
  );
}

// #region styles

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  color: white;
`;

const PaneContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
`;

const LeftPaneContainer = css`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  padding-bottom: 0;
  height: 100vh;
  background-color: ${DARK_COLOR};
  z-index: 10;
`;

const RightPaneContainer = css`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: ${DARK_COLOR};
  z-index: 10;
`;

const WorkspaceContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background-color: ${LIGHT_COLOR};
`;

// todo remove .btn when Toolbar is converted
const ToolbarContainer = styled.div`
  display: flex;
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  background-color: ${DARK_COLOR};
  z-index: 10;

  .btn,
  ${Button} {
    padding: 6px 12px;
    border-radius: 0;
  }
`;

const Version = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  padding: 0.625rem;
  opacity: 0.5;
`;

const TrackingControlGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

// #endregion
