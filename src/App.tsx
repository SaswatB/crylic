import React, { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { produce } from "immer";
import { camelCase, snakeCase, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import {
  CompilerComponentViewRef,
  GetElementByLookupId,
  OnCompileEndCallback,
  ViewContext,
} from "./components/CompilerComponentView";
import { EditorPane } from "./components/EditorPane/EditorPane";
import { InputModal } from "./components/InputModal";
import { OverlayComponentView } from "./components/OverlayComponentView";
import { SideBar } from "./components/SideBar";
import { Toolbar } from "./components/Toolbar";
import { openFilePicker } from "./hooks/useFilePicker";
import {
  CodeEntry,
  OutlineElement,
  RenderEntry,
  SelectedElement,
  Styles,
} from "./types/paint";
import { prettyPrintCodeEntryAST } from "./utils/ast/ast-helpers";
import {
  EditContext,
  ElementASTEditor,
  StyleASTEditor,
  StyleGroup,
} from "./utils/ast/editors/ASTEditor";
import {
  DEFAULT_FRAME_HEIGHT,
  DEFAULT_FRAME_WIDTH,
  getBoilerPlateComponent,
  SelectMode,
  SelectModeType,
} from "./utils/constants";
import { Project } from "./utils/Project";
import { buildOutline } from "./utils/utils";
import "./App.scss";

function App() {
  const { enqueueSnackbar } = useSnackbar();
  const componentViews = useRef<
    Record<string, CompilerComponentViewRef | null | undefined>
  >({});
  const viewContextMap = useRef<Record<string, ViewContext | undefined>>({});

  const [project, setProject] = useState<Project>();
  (window as any).project = project; // only for debugging purposes
  const codeChangeStack = useRef<{ id: string; code: string }[]>([]);
  const codeRedoStack = useRef<{ id: string; code: string }[]>([]);
  const setCode = (
    codeId: string,
    code: string,
    isUndo = false,
    isRedo = false
  ) =>
    setProject((currentProject) => {
      const oldCode = currentProject?.getCodeEntry(codeId)?.code;
      if (oldCode === code) return project;

      // keep track of undo/redo state
      if (oldCode !== undefined) {
        const changeEntry = { id: codeId, code: oldCode };
        if (isUndo) {
          // save the old state in the redo stack for undos
          codeRedoStack.current.push(changeEntry);
        } else {
          // save changes in the undo stack
          codeChangeStack.current.push(changeEntry);

          // clear the redo stack if the change isn't an undo or redo
          if (!isRedo) {
            codeRedoStack.current = [];
          }
        }
      }

      // apply change
      return currentProject?.editCodeEntry(codeId, { code });
    });
  const setCodeAstEdit = (editedAst: any, codeEntry: CodeEntry) => {
    // remove lookup data from the ast and get the transformed code
    project?.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
      editedAst = editor.removeLookupData({ ast: editedAst, codeEntry });
    });
    // save the edited code
    setCode(codeEntry.id, prettyPrintCodeEntryAST(codeEntry, editedAst));
  };
  const toggleCodeEntryEdit = (codeId: string) =>
    setProject((project) =>
      project?.editCodeEntry(codeId, {
        edit: !project.getCodeEntry(codeId)?.edit,
      })
    );
  const toggleCodeEntryRender = (codeId: string) =>
    setProject((project) =>
      project?.addRenderEntry(project.getCodeEntry(codeId)!)
    );
  const addCodeEntry = (
    partialEntry: Partial<CodeEntry> & { filePath: string }
  ) => setProject((project) => project?.addCodeEntries(partialEntry));
  // handle undo/redo hotkeys
  useHotkeys("ctrl+z", () => {
    const change = codeChangeStack.current.pop();
    console.log("undo", change);
    if (change) {
      setCode(change.id, change.code, true);
    }
  });
  useHotkeys("ctrl+shift+z", () => {
    const change = codeRedoStack.current.pop();
    console.log("redo", change);
    if (change) {
      setCode(change.id, change.code, false, true);
    }
  });

  const [selectMode, setSelectMode] = useState<SelectMode>();
  const [selectedElement, setSelectedElement] = useState<SelectedElement>();
  // clear select mode on escape hotkey
  useHotkeys("escape", () => setSelectMode(undefined));

  const selectElement = (renderId: string, componentElement: HTMLElement) => {
    const lookupId = project?.primaryElementEditor.getLookupIdFromHTMLElement(
      componentElement
    );
    if (!lookupId) return;
    const codeId = project?.primaryElementEditor.getCodeIdFromLookupId(
      lookupId
    );
    if (!codeId) return;
    const codeEntry = project?.getCodeEntry(codeId);
    if (!codeEntry) return;

    const styleGroups: StyleGroup[] = [];

    project?.editorEntries.forEach(({ editor }) => {
      styleGroups.push(
        ...editor.getStyleGroupsFromHTMLElement(componentElement)
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
      element: componentElement,
      styleGroups,
      computedStyles: window.getComputedStyle(componentElement),
      inlineStyles: componentElement.style,
    });
  };

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
    Record<
      string,
      ((getElementByLookupId: GetElementByLookupId) => void)[] | undefined
    >
  >({});
  const onComponentViewCompiled: OnCompileEndCallback = (
    renderEntry,
    viewContext
  ) => {
    viewContextMap.current[renderEntry.id] = viewContext;
    const { iframe, getElementByLookupId } = viewContext;

    project?.editorEntries.forEach(({ editor }) => editor.onASTRender(iframe));

    if (
      selectedElement &&
      project?.primaryElementEditor.getCodeIdFromLookupId(
        selectedElement.lookupId
      ) === renderEntry.codeId
    ) {
      const newSelectedComponent = getElementByLookupId(
        selectedElement.lookupId
      );
      if (newSelectedComponent) {
        console.log(
          "setting selected element post-compile",
          selectedElement.lookupId
        );
        selectElement(renderEntry.id, newSelectedComponent as HTMLElement);
      } else {
        setSelectedElement(undefined);
      }
    }

    calculateOutline(renderEntry);

    compileTasks.current[renderEntry.id]?.forEach((task) =>
      task(getElementByLookupId)
    );
    compileTasks.current[renderEntry.id] = [];
  };

  const onOverlaySelectElement = (
    renderId: string,
    componentElement: HTMLElement,
    componentView: CompilerComponentViewRef
  ) => {
    switch (selectMode?.type) {
      default:
      case SelectModeType.SelectElement:
        console.log(
          "setting selected from manual selection",
          project?.primaryElementEditor.getLookupIdFromHTMLElement(
            componentElement as HTMLElement
          )
        );
        selectElement(renderId, componentElement);
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

        let newAst = project?.primaryElementEditor.addChildToElement(
          { ast: codeEntry.ast, codeEntry, lookupId },
          selectMode.tag,
          selectMode.attributes
        );
        const [newChildLookupId] =
          project?.primaryElementEditor.getRecentlyAddedElements({
            ast: newAst,
            codeEntry,
          }) || [];

        if (newChildLookupId !== undefined) {
          // try to select the newly added element when the CompilerComponentView next compiles
          compileTasks.current[renderId] = compileTasks.current[renderId] || [];
          compileTasks.current[renderId]!.push((getElementByLookupId) => {
            const newChildComponent = getElementByLookupId(newChildLookupId!);
            if (newChildComponent) {
              console.log(
                "setting selected element through post-child add",
                newChildLookupId
              );
              selectElement(renderId, newChildComponent as HTMLElement);
            }
          });
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
      editor.addStyles(editContext, styles)
    );
  };

  const updateSelectedElementStyle = (
    styleGroup: StyleGroup,
    styleProp: keyof CSSStyleDeclaration,
    newValue: string,
    preview?: boolean
  ) => {
    if (
      selectedElement &&
      newValue !== selectedElement?.computedStyles[styleProp]
    ) {
      updateSelectedElementStyles(
        styleGroup,
        [{ styleName: styleProp, styleValue: newValue }],
        preview
      );
    }
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

  const scaleRef = useRef(1);
  const [frameSize, setFrameSize] = useState({
    width: DEFAULT_FRAME_WIDTH,
    height: DEFAULT_FRAME_HEIGHT,
  });
  const renderSideBar = () => (
    <SideBar
      outlineMap={outlineMap}
      project={project}
      selectElement={selectElement}
      selectedElement={selectedElement}
      onChangeSelectMode={setSelectMode}
      updateSelectedElementStyle={updateSelectedElementStyle}
      updateSelectedElement={updateSelectedElement}
      updateSelectedElementImage={updateSelectedElementImage}
      onChangeFrameSize={(width, height) => {
        setFrameSize(
          produce((draft) => {
            if (width) draft.width = width;
            if (height) draft.height = height;
          })
        );
      }}
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
        // todo render component on create
        addCodeEntry({ filePath, code, edit: false });
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
        addCodeEntry({ filePath, edit: true });
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
      onNewProject={async (p) =>
        setProject(await Project.createNewProjectInDirectory(p))
      }
      onOpenProject={async (p) =>
        setProject(await Project.createProjectFromDirectory(p))
      }
      onSaveProject={() => project?.saveFiles()}
      onCloseProject={() => setProject(undefined)}
      toggleCodeEntryEdit={toggleCodeEntryEdit}
      toggleCodeEntryRender={toggleCodeEntryRender}
    />
  );

  const [resetTransform, setResetTransform] = useState(false);
  useEffect(() => {
    if (resetTransform) setResetTransform(false);
  }, [resetTransform]);

  const renderToolbar = () => (
    <Toolbar
      setResetTransform={setResetTransform}
      selectMode={selectMode}
      setSelectMode={setSelectMode}
      selectedElement={selectedElement}
      setSelectedElement={setSelectedElement}
    />
  );

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
          onCompileEnd: onComponentViewCompiled,
        }}
        frameSize={frameSize}
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

          // todo check if Route is imported
          const newAst = project.primaryElementEditor.addChildToElement(
            { ast: codeEntry.ast, codeEntry, lookupId: switchLookupId },
            "Route",
            { path }
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
        onRemoveComponentView={() =>
          setProject((currentProject) =>
            currentProject?.removeRenderEntry(entry.id)
          )
        }
      />
    ));

  return (
    <div className="flex flex-col items-stretch w-screen h-screen relative overflow-hidden text-white">
      <div className="flex flex-1 flex-row">
        <div
          className="flex flex-col absolute p-4 pb-0 h-screen dark-glass z-10"
          style={{ width: "300px" }}
        >
          {renderSideBar()}
        </div>
        <div className="flex flex-col flex-1 relative bg-gray-600 items-center justify-center overflow-hidden">
          {(project?.renderEntries.length ?? 0) > 0 && (
            <div
              className="toolbar flex absolute top-0 right-0 dark-glass z-10"
              style={{ left: 300 }}
            >
              {renderToolbar()}
            </div>
          )}
          <TransformWrapper
            defaultScale={1}
            scale={resetTransform ? 1 : undefined}
            positionX={resetTransform ? 350 : undefined}
            positionY={resetTransform ? 20 : undefined}
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
        {project?.codeEntries.find(({ edit }) => edit) && (
          <EditorPane
            project={project}
            onCodeChange={(codeId, newCode) => {
              setCode(codeId, newCode);
            }}
            onCloseCodeEntry={toggleCodeEntryEdit}
            selectedElementId={selectedElement?.lookupId}
            onSelectElement={(lookupId) => {
              const newSelectedComponent = Object.values(componentViews.current)
                .map((componentView) =>
                  componentView?.getElementByLookupId(lookupId)
                )
                .filter((e) => !!e)[0];
              if (newSelectedComponent) {
                console.log(
                  "setting selected element through editor cursor update",
                  project?.primaryElementEditor.getLookupIdFromHTMLElement(
                    newSelectedComponent as HTMLElement
                  )
                );
                // todo reenable
                // selectElement(newSelectedComponent as HTMLElement);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
