import React, { useContext, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { faBars } from "@fortawesome/free-solid-svg-icons";
import {
  Backdrop,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@material-ui/core";
import { produce } from "immer";
import { camelCase, snakeCase, upperFirst } from "lodash";
import { useSnackbar } from "notistack";
import { Resizable } from "re-resizable";
import { useBus } from "ts-bus/react";

import {
  CompilerComponentViewRef,
  OnCompileEndCallback,
  ViewContext,
} from "./components/ComponentView/CompilerComponentView";
import { OverlayComponentView } from "./components/ComponentView/OverlayComponentView";
import { IconButton } from "./components/IconButton";
import { InputModal } from "./components/InputModal";
import { AssetTreePane } from "./components/SideBar/AssetTreePane";
import { CodeEditorPane } from "./components/SideBar/CodeEditorPane/CodeEditorPane";
import { ElementEditorPane } from "./components/SideBar/ElementEditorPane";
import { OutlinePane } from "./components/SideBar/OutlinePane";
import { Terminal } from "./components/Terminal";
import { Toolbar } from "./components/Toolbar";
import { Tour, TourContext } from "./components/Tour";
import { openFilePicker, saveFilePicker } from "./hooks/useFilePicker";
import { useMenuInput } from "./hooks/useInput";
import { useProject } from "./hooks/useProject";
import { useUpdatingRef } from "./hooks/useUpdatingRef";
import { editorOpenLocation, editorResize } from "./lib/events";
import { Project } from "./lib/project/Project";
import {
  CodeEntry,
  OutlineElement,
  RenderEntry,
  SelectedElement,
  Styles,
} from "./types/paint";
import {
  EditContext,
  ElementASTEditor,
  StyleASTEditor,
  StyleGroup,
} from "./utils/ast/editors/ASTEditor";
import {
  ComponentViewZoomAction,
  getBoilerPlateComponent,
  SelectMode,
  SelectModeType,
} from "./utils/constants";
import { routeComponent } from "./utils/defs/react-router-dom";
import { buildOutline, sleep } from "./utils/utils";
import "./App.scss";

const open = __non_webpack_require__("open") as typeof import("open");

function App() {
  const { enqueueSnackbar } = useSnackbar();
  const bus = useBus();
  const [loading, setLoading] = useState(0);
  const componentViews = useRef<
    Record<string, CompilerComponentViewRef | null | undefined>
  >({});
  const viewContextMap = useRef<Record<string, ViewContext | undefined>>({});

  const {
    project,
    setProject,
    newProject,
    openProject,
    closeProject,
    undoCodeChange,
    redoCodeChange,
    addCodeEntry,
    setCode,
    setCodeAstEdit,
    toggleCodeEntryEdit,
    addRenderEntry,
    installPackages,
    installingPackages,
    installPackagesOutput,
  } = useProject();
  const projectRef = useUpdatingRef(project);

  // handle save/undo/redo hotkeys
  useHotkeys("ctrl+s", () => projectRef.current?.saveFiles());
  useHotkeys("ctrl+z", undoCodeChange);
  useHotkeys("ctrl+shift+z", redoCodeChange);

  const [selectMode, setSelectMode] = useState<SelectMode>();
  const [selectedElement, setSelectedElement] = useState<SelectedElement>();
  // for debugging purposes
  (window as any).selectedElement = selectedElement;
  // clear select mode on escape hotkey
  useHotkeys("escape", () => setSelectMode(undefined));

  const selectElement = useUpdatingRef((renderId: string, lookupId: string) => {
    const { getElementsByLookupId } = viewContextMap.current[renderId] || {};
    const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
      lookupId
    );
    if (!codeId) {
      console.log("dropping element select, no code id");
      return;
    }
    const codeEntry = project?.getCodeEntry(codeId);
    if (!codeEntry) {
      console.log("dropping element select, no code entry");
      return;
    }
    const componentElements = getElementsByLookupId?.(lookupId);
    if (!componentElements?.length) {
      console.log("dropping element select, no elements");
      return;
    }

    const styleGroups: StyleGroup[] = [];

    project?.editorEntries.forEach(({ editor }) => {
      styleGroups.push(
        ...editor.getStyleGroupsFromHTMLElement(componentElements[0])
      );
    });

    setSelectedElement({
      renderId,
      lookupId,
      sourceMetadata: project!.primaryElementEditor.getSourceMetaDataFromLookupId(
        { ast: codeEntry.ast, codeEntry },
        lookupId
      ),
      viewContext: viewContextMap.current[renderId],
      element: componentElements[0],
      elements: componentElements,
      styleGroups,
      // todo properly support multiple elements instead of taking the first one
      computedStyles: window.getComputedStyle(componentElements[0]),
      inlineStyles: componentElements[0].style,
    });
  });
  // there are instances where selected element will have it's underlying dom element replaced
  // so to try and handle such cases, this attempts to reselect the selected element if the parent element is missing
  const badSelectedElementRetryCounter = useRef(0);
  useEffect(() => {
    if (!selectedElement) return;
    if (!selectedElement.element.parentElement) {
      if (badSelectedElementRetryCounter.current === 0) {
        badSelectedElementRetryCounter.current++;
        selectElement.current(
          selectedElement.renderId,
          selectedElement.lookupId
        );
      }
    } else {
      badSelectedElementRetryCounter.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!selectedElement?.element.parentElement]);

  const [outlineMap, setOutlineMap] = useState<
    Record<string, OutlineElement[] | undefined>
  >({});
  const calculateOutline = (renderEntry: RenderEntry) => {
    const { getRootElement } = viewContextMap.current[renderEntry.id] || {};
    if (!getRootElement) return;

    const root = getRootElement();
    setOutlineMap(
      produce((currentOutlineMap) => {
        currentOutlineMap[renderEntry.id] = root
          ? buildOutline(project!, renderEntry.id, root)
          : undefined;
      })
    );
  };

  const compileTasks = useRef<
    Record<string, ((viewContext: ViewContext) => void)[] | undefined>
  >({});
  const onComponentViewCompiled = useUpdatingRef<OnCompileEndCallback>(
    (renderEntry, viewContext) => {
      viewContextMap.current[renderEntry.id] = viewContext;
      const { iframe } = viewContext;

      project?.editorEntries.forEach(({ editor }) =>
        editor.onASTRender(iframe)
      );

      calculateOutline(renderEntry);

      compileTasks.current[renderEntry.id]?.forEach((task) =>
        task(viewContext)
      );
      compileTasks.current[renderEntry.id] = [];
    }
  );

  const onComponentViewReload = useUpdatingRef(
    async (renderEntry: RenderEntry) => {
      const { getElementsByLookupId } =
        viewContextMap.current[renderEntry.id] || {};

      // refresh the selected element when the iframe reloads, if possible
      if (selectedElement?.renderId === renderEntry.id) {
        let newSelectedComponent = undefined;
        for (let i = 0; i < 5 && !newSelectedComponent; i++) {
          newSelectedComponent = getElementsByLookupId?.(
            selectedElement.lookupId
          )[0];
          if (!newSelectedComponent) await sleep(100);
        }

        if (newSelectedComponent) {
          console.log(
            "setting selected element post-iframe reload",
            selectedElement.lookupId
          );
          selectElement.current(renderEntry.id, selectedElement.lookupId);
        } else {
          console.log(
            "unable to reselect selected element post-iframe reload",
            selectedElement.lookupId
          );
          setSelectedElement(undefined);
        }
      }

      calculateOutline(renderEntry);
    }
  );

  const onOverlaySelectElement = (
    renderId: string,
    componentElement: HTMLElement,
    componentView: CompilerComponentViewRef
  ) => {
    switch (selectMode?.type) {
      default:
      case SelectModeType.SelectElement:
        const lookupId = project?.primaryElementEditor.getLookupIdFromHTMLElement(
          componentElement
        );
        console.log("setting selected from manual selection", lookupId);
        if (lookupId) selectElement.current(renderId, lookupId);
        break;
      case SelectModeType.AddElement: {
        const lookupId = project?.primaryElementEditor.getLookupIdFromHTMLElement(
          componentElement
        );
        if (!lookupId) break;

        const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
          lookupId
        );
        if (!codeId) break;
        const codeEntry = project?.codeEntries.find(
          (codeEntry) => codeEntry.id === codeId
        );
        if (!codeEntry) break;

        const componentPath =
          !selectMode.isHTMLElement && selectMode.component.import.path;

        // don't allow adding a component to itself
        if (componentPath === codeEntry.filePath) {
          enqueueSnackbar("Cannot add a component as a child of itself");
          break;
        }

        let newAst = project?.primaryElementEditor.addChildToElement(
          { ast: codeEntry.ast, codeEntry, lookupId },
          selectMode
        );
        const [newChildLookupId] =
          project?.primaryElementEditor.getRecentlyAddedElements({
            ast: newAst,
            codeEntry,
          }) || [];

        if (newChildLookupId !== undefined) {
          // try to select the newly added element when the CompilerComponentView next compiles
          compileTasks.current[renderId] = compileTasks.current[renderId] || [];
          compileTasks.current[renderId]!.push(
            async ({ getElementsByLookupId }) => {
              let newChildComponent = undefined;
              for (let i = 0; i < 5 && !newChildComponent; i++) {
                newChildComponent = getElementsByLookupId(newChildLookupId!)[0];
                if (!newChildComponent) await sleep(100);
              }
              if (newChildComponent) {
                console.log(
                  "setting selected element through post-child add",
                  newChildLookupId
                );
                selectElement.current(renderId, newChildLookupId);
              }
            }
          );
        }

        setCodeAstEdit(newAst, codeEntry);
        break;
      }
    }

    setSelectMode(undefined);
  };

  const updateStyleGroup = <T extends {}>(
    styleGroup: StyleGroup,
    apply: (editor: StyleASTEditor<T>, editContext: EditContext<T>) => T
  ) => {
    // gather prerequisites
    const { editor, lookupId } = styleGroup;
    const codeId = editor.getCodeIdFromLookupId(lookupId);
    if (!codeId) return;
    const codeEntry = project?.getCodeEntry(codeId);
    if (!codeEntry) return;

    // update ast
    const newAst = apply(editor, { ast: codeEntry.ast, codeEntry, lookupId });

    setCodeAstEdit(newAst, codeEntry);
  };
  const updateSelectedElement = <T extends {}>(
    apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T
  ) => {
    // gather prerequisites
    if (!selectedElement) return;
    const editor = project?.primaryElementEditor;
    if (!editor) return;
    const { lookupId } = selectedElement;
    const codeId = editor.getCodeIdFromLookupId(lookupId);
    if (!codeId) return;
    const codeEntry = project?.getCodeEntry(codeId);
    if (!codeEntry) return;

    // update ast
    const newAst = apply(editor, { ast: codeEntry.ast, codeEntry, lookupId });

    setCodeAstEdit(newAst, codeEntry);

    // refresh the selected element after compile to get the new ast metadata
    compileTasks.current[selectedElement.renderId]?.push(() => {
      selectElement.current(selectedElement.renderId, selectedElement.lookupId);
    });
  };

  const updateSelectedElementStyles = (
    styleGroup: StyleGroup,
    styles: Styles,
    preview?: boolean
  ) => {
    if (!selectedElement) return;

    const componentView = componentViews.current[selectedElement.renderId];
    componentView?.addTempStyles(selectedElement.lookupId, styles, !preview);
    // preview is a flag used to quickly show updates in the dom
    // there shouldn't be any expensive calculations done when it's on
    // such as changing state or parsing ast
    if (preview) return;

    updateStyleGroup(styleGroup, (editor, editContext) =>
      editor.applyStyles(editContext, styles)
    );
  };

  const updateSelectedElementStyle = (
    styleGroup: StyleGroup,
    styleProp: keyof CSSStyleDeclaration,
    newValue: string,
    preview?: boolean
  ) => {
    updateSelectedElementStyles(
      styleGroup,
      [{ styleName: styleProp, styleValue: newValue }],
      preview
    );
  };

  const updateSelectedElementImage = (
    styleGroup: StyleGroup,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry
  ) => {
    updateStyleGroup(styleGroup, (editor, editContext) =>
      editor.updateElementImage(editContext, imageProp, assetEntry)
    );
  };

  const renderIntro = () => (
    <div className="btngrp-v w-full">
      <button
        className="btn w-full"
        data-tour="new-project"
        onClick={() =>
          saveFilePicker({
            filters: [{ name: "Project", extensions: [""] }],
          }).then((f) => {
            if (f) newProject(f);
          })
        }
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
        onClick={() =>
          openFilePicker({ properties: ["openDirectory"] }).then((filePath) => {
            if (!filePath) return;
            setLoading((l) => l + 1);
            // set timeout allows react to render the loading screen before
            // the main thread get's pegged from opening the project
            setTimeout(
              () =>
                openProject(filePath).finally(() => setLoading((l) => l - 1)),
              150
            );
          })
        }
      >
        Open Project
      </button>
    </div>
  );

  const [showInstallDialog, setShowInstallDialog] = useState(false);
  useEffect(() => {
    if (installingPackages) setShowInstallDialog(true);
  }, [installingPackages]);
  const renderInstallDialog = () => (
    <Dialog
      open={showInstallDialog}
      onClose={
        installingPackages ? undefined : () => setShowInstallDialog(false)
      }
      maxWidth="xl"
    >
      <DialogTitle>
        {installingPackages ? "Installing..." : "Installation Complete"}
      </DialogTitle>
      <DialogContent>
        <Terminal writer={installPackagesOutput} />
      </DialogContent>
      <DialogActions>
        {!installingPackages && (
          // todo cancel button?
          <Button onClick={() => setShowInstallDialog(false)} color="primary">
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
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
          setSelectedElement(undefined);
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
      <OutlinePane
        project={project}
        outlineMap={outlineMap}
        refreshOutline={(renderId) => {
          const entry = project.renderEntries.find((e) => e.id === renderId);
          if (entry) calculateOutline(entry);
        }}
        selectedElement={selectedElement}
        selectElement={(r, c) => {
          const lookupId = project.primaryElementEditor.getLookupIdFromHTMLElement(
            c
          );
          if (lookupId) selectElement.current(r, lookupId);
        }}
      />
      <Resizable
        minHeight={100}
        defaultSize={{ height: 225, width: "auto" }}
        enable={{ top: true }}
        onResizeStop={() => bus.publish(editorResize())}
      >
        <AssetTreePane
          project={project}
          onNewComponent={async () => {
            const inputName = await InputModal({
              title: "New Component",
              message: "Please enter a component name",
            });
            if (!inputName) return;
            // todo add validation/duplicate checking to name
            const name = upperFirst(camelCase(inputName));
            const filePath = project!.getNewComponentPath(name);
            const code = getBoilerPlateComponent(name);
            addCodeEntry({ filePath, code }, { render: true });
            enqueueSnackbar("Started a new component!");
          }}
          onNewStyleSheet={async () => {
            const inputName = await InputModal({
              title: "New StyleSheet",
              message: "Please enter a stylesheet name",
            });
            if (!inputName) return;
            // todo add validation/duplicate checking to name
            const name = camelCase(inputName);
            const filePath = project!.getNewStyleSheetPath(name);
            addCodeEntry({ filePath }, { edit: true });
            enqueueSnackbar("Started a new component!");
          }}
          onImportImage={async () => {
            const file = await openFilePicker({
              filters: [
                {
                  name: "Image (.jpg,.jpeg,.png,.gif,.svg)",
                  extensions: ["jpg", "jpeg", "png", "gif", "svg"],
                },
              ],
            });
            if (!file) return;
            setProject((currentProject) => currentProject?.addAsset(file));
            enqueueSnackbar("Imported Image!");
          }}
          onChangeSelectMode={setSelectMode}
          toggleCodeEntryEdit={toggleCodeEntryEdit}
          addRenderEntry={addRenderEntry}
        />
      </Resizable>
    </>
  );
  const renderRightPane = (project: Project) => (
    <ElementEditorPane
      project={project}
      selectedElement={selectedElement}
      updateSelectedElementStyle={updateSelectedElementStyle}
      updateSelectedElementStyles={updateSelectedElementStyles}
      updateSelectedElement={updateSelectedElement}
      updateSelectedElementImage={updateSelectedElementImage}
      openInEditor={(styleGroup) => {
        const { editor, lookupId } = styleGroup;
        const codeId = editor.getCodeIdFromLookupId(lookupId);
        if (!codeId) return;
        const codeEntry = project.getCodeEntry(codeId);
        if (!codeEntry) return;
        const line = editor.getCodeLineFromLookupId(
          { codeEntry, ast: codeEntry.ast },
          lookupId
        );
        console.log("openInEditor", codeEntry, line);
        let timeout = 0;
        if (!project.editEntries.find((e) => e.codeId === codeEntry.id)) {
          toggleCodeEntryEdit(codeEntry);
          // todo don't cheat with a timeout here
          timeout = 500;
        }
        setTimeout(
          () => bus.publish(editorOpenLocation({ codeEntry, line })),
          timeout
        );
      }}
      installPackage={installPackages}
    />
  );

  const [zoomAction, setZoomAction] = useState<ComponentViewZoomAction>();
  useEffect(() => {
    if (zoomAction) setZoomAction(undefined);
  }, [zoomAction]);

  const renderToolbar = (project: Project) => (
    <Toolbar
      project={project}
      setZoomAction={setZoomAction}
      selectMode={selectMode}
      setSelectMode={setSelectMode}
      selectedElement={selectedElement}
      setSelectedElement={setSelectedElement}
      installPackages={installPackages}
    />
  );

  const scaleRef = useRef(1);
  const renderComponentViews = () =>
    project?.renderEntries.map((entry) => (
      <OverlayComponentView
        key={entry.id}
        compilerProps={{
          ref(componentView) {
            componentViews.current[entry.id] = componentView;
          },
          project,
          renderEntry: entry,
          onCompileEnd: (...args) => onComponentViewCompiled.current(...args),
          onNewPublishUrl(url) {
            // open a published component in a brower whenever it gets a new url
            open(url);
          },
          onReload: (...args) => onComponentViewReload.current(...args),
        }}
        scaleRef={scaleRef}
        selectModeType={selectMode?.type}
        selectedElement={selectedElement}
        onSelectElement={onOverlaySelectElement}
        updateSelectedElementStyles={updateSelectedElementStyles}
        onAddRoute={async (routeDefinition) => {
          const inputName = await InputModal({
            title: "New Route",
            message: "Please enter a route name",
          });
          if (!inputName) return;
          // todo show preview of name in dialog
          const name = snakeCase(inputName.replace(/[^a-z0-9]/g, ""));
          const path = `/${name}`;
          const switchLookupId = project!.primaryElementEditor.getLookupIdFromProps(
            routeDefinition.switchProps
          )!;
          const codeEntry = project.getCodeEntry(
            project.primaryElementEditor.getCodeIdFromLookupId(switchLookupId)
          );
          if (!codeEntry) return;

          const newAst = project.primaryElementEditor.addChildToElement(
            { ast: codeEntry.ast, codeEntry, lookupId: switchLookupId },
            {
              component: routeComponent,
              attributes: { path },
            }
          );
          setCodeAstEdit(newAst, codeEntry!);
          setProject((currentProject) =>
            currentProject?.editRenderEntry(entry.id, { route: path })
          );
        }}
        onCurrentRouteChange={(currentRoute) => {
          setProject((currentProject) =>
            currentProject?.editRenderEntry(entry.id, { route: currentRoute })
          );
          calculateOutline(entry);
          if (selectedElement?.renderId === entry.id)
            setSelectedElement(undefined);
        }}
        onTogglePublish={() => {
          console.log("onTogglePublish");
          setProject((currentProject) =>
            currentProject?.editRenderEntry(entry.id, {
              publish: !entry.publish,
            })
          );
        }}
        onRemoveComponentView={() =>
          setProject((currentProject) =>
            currentProject?.removeRenderEntry(entry.id)
          )
        }
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
      {renderInstallDialog()}
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
              {renderToolbar(project)}
            </div>
          )}
          {!project && (
            <div className="flex flex-1 w-64 absolute items-center justify-center z-10">
              {renderIntro()}
            </div>
          )}
          <TransformWrapper
            defaultScale={1}
            scale={
              zoomAction === ComponentViewZoomAction.RESET
                ? (scaleRef.current = 1)
                : zoomAction === ComponentViewZoomAction.ZOOM_IN
                ? (scaleRef.current = scaleRef.current * 1.5)
                : zoomAction === ComponentViewZoomAction.ZOOM_OUT
                ? (scaleRef.current = scaleRef.current / 1.5)
                : undefined
            }
            defaultPositionX={50}
            defaultPositionY={20}
            positionX={
              zoomAction === ComponentViewZoomAction.RESET ? 50 : undefined
            }
            positionY={
              zoomAction === ComponentViewZoomAction.RESET ? 20 : undefined
            }
            options={{
              minScale: 0.01,
              maxScale: 3,
              limitToBounds: false,
            }}
            onZoomChange={({ scale }: { scale: number }) =>
              (scaleRef.current = scale)
            }
          >
            <TransformComponent>{renderComponentViews()}</TransformComponent>
          </TransformWrapper>
        </div>
        {project && (
          <Resizable
            className="flex flex-col h-screen bg-gray-800 z-10"
            minWidth={200}
            maxWidth={500}
            defaultSize={{ height: "100vh", width: 300 }}
            enable={{ left: true }}
          >
            {renderRightPane(project)}
          </Resizable>
        )}
        {project && project.editEntries.length > 0 && (
          <Resizable
            minWidth={200}
            maxWidth={1200}
            defaultSize={{ height: "100vh", width: 400 }}
            enable={{ left: true }}
            onResizeStop={() => bus.publish(editorResize())}
          >
            <CodeEditorPane
              project={project}
              onCodeChange={(codeId, newCode) => {
                setCode(codeId, newCode);
              }}
              onCloseCodeEntry={toggleCodeEntryEdit}
              selectedElementId={selectedElement?.lookupId}
              onSelectElement={(lookupId) => {
                // todo reenable
                // const newSelectedComponent = Object.values(componentViews.current)
                //   .map((componentView) =>
                //     componentView?.getElementsByLookupId(lookupId)
                //   )
                //   .filter((e) => !!e)[0];
                // if (newSelectedComponent) {
                //   console.log(
                //     "setting selected element through editor cursor update",
                //     project?.primaryElementEditor.getLookupIdFromHTMLElement(
                //       newSelectedComponent as HTMLElement
                //     )
                //   );
                //   selectElement(newSelectedComponent as HTMLElement);
                // }
              }}
            />
          </Resizable>
        )}
      </div>
    </div>
  );
}

export default App;
