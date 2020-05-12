import React, { useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { produce } from "immer";
import { camelCase, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import {
  CompilerComponentViewRef,
  GetElementByLookupId,
  OnCompileEndCallback,
} from "./components/CompilerComponentView";
import { EditorPane } from "./components/EditorPane/EditorPane";
import { InputModal } from "./components/InputModal";
import { OverlayComponentView } from "./components/OverlayComponentView";
import { SideBar } from "./components/SideBar";
import { openFilePicker } from "./hooks/useFilePicker";
import {
  CodeEntry,
  OutlineElement,
  SelectedElement,
  Styles,
} from "./types/paint";
import {
  prettyPrintCodeEntryAST,
  printCodeEntryAST,
} from "./utils/ast/ast-helpers";
import { StyleGroup } from "./utils/ast/editors/ASTEditor";
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
      editedAst = editor.removeLookupData(editedAst, codeEntry);
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
      project?.editCodeEntry(codeId, {
        render: !project.getCodeEntry(codeId)?.render,
      })
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

  const selectElement = (componentElement: HTMLElement) => {
    const lookupId = project?.primaryElementEditor.getLookupIdFromHTMLElement(
      componentElement
    );
    if (!lookupId) return;

    const styleGroups: StyleGroup[] = [];

    project?.editorEntries.forEach(({ editor }) => {
      styleGroups.push(
        ...editor.getStyleGroupsFromHTMLElement(componentElement)
      );
    });

    setSelectedElement({
      lookupId,
      element: componentElement,
      styleGroups,
      computedStyles: window.getComputedStyle(componentElement),
      inlineStyles: componentElement.style,
    });
  };

  const [outlineMap, setOutlineMap] = useState<
    Record<string, OutlineElement[] | undefined>
  >({});
  const compileTasks = useRef<
    Record<
      string,
      ((getElementByLookupId: GetElementByLookupId) => void)[] | undefined
    >
  >({});
  const onComponentViewCompiled: OnCompileEndCallback = (
    codeId,
    { iframe, getRootElement, getElementByLookupId }
  ) => {
    project?.editorEntries.forEach(({ editor }) => editor.onASTRender(iframe));

    if (
      selectedElement &&
      project?.primaryElementEditor.getCodeIdFromLookupId(
        selectedElement.lookupId
      ) === codeId
    ) {
      const newSelectedComponent = getElementByLookupId(
        selectedElement.lookupId
      );
      if (newSelectedComponent) {
        console.log(
          "setting selected element post-compile",
          selectedElement.lookupId
        );
        selectElement(newSelectedComponent as HTMLElement);
      } else {
        setSelectedElement(undefined);
      }
    }

    const root = getRootElement();
    setOutlineMap(
      produce((currentOutlineMap) => {
        currentOutlineMap[codeId] = root
          ? buildOutline(project!, root)
          : undefined;
      })
    );

    compileTasks.current[codeId]?.forEach((task) => task(getElementByLookupId));
    compileTasks.current[codeId] = [];
  };

  const onOverlaySelectElement = (
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
        selectElement(componentElement);
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
          codeEntry.ast,
          codeEntry,
          lookupId,
          selectMode.tag,
          selectMode.attributes
        );
        const [newChildLookupId] =
          project?.primaryElementEditor.getRecentlyAddedElements(
            newAst,
            codeEntry
          ) || [];

        if (newChildLookupId !== undefined) {
          // try to select the newly added element when the CompilerComponentView next compiles
          compileTasks.current[codeId] = compileTasks.current[codeId] || [];
          compileTasks.current[codeId]!.push((getElementByLookupId) => {
            const newChildComponent = getElementByLookupId(newChildLookupId!);
            if (newChildComponent) {
              console.log(
                "setting selected element through post-child add",
                newChildLookupId
              );
              selectElement(newChildComponent as HTMLElement);
            }
          });
        }

        project?.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
          newAst = editor.removeLookupData(newAst, codeEntry);
        });
        setCode(codeId, printCodeEntryAST(codeEntry, newAst));
        break;
      }
    }

    setSelectMode(undefined);
  };

  const updateSelectedElementStyles = (
    styleGroup: StyleGroup,
    styles: Styles,
    preview?: boolean
  ) => {
    if (!selectedElement) return;

    const selectedCodeId = project?.primaryElementEditor.getCodeIdFromLookupId(
      selectedElement.lookupId
    );
    if (!selectedCodeId) return;
    const componentView = componentViews.current[selectedCodeId];
    componentView?.addTempStyles(selectedElement.lookupId, styles, !preview);
    // preview is a flag used to quickly show updates in the dom
    // there shouldn't be any expensive calculations done when it's on
    // such as changing state or parsing ast
    if (preview) return;

    // get the ast editor for the style group
    const { editor } = styleGroup;

    // get the code entry to edit from the lookup id
    const editedCodeId = editor.getCodeIdFromLookupId(styleGroup.lookupId);
    const editedCodeEntry = project?.getCodeEntry(editedCodeId);
    if (!editedCodeEntry) return;

    // add styles to the ast
    const newAst = editor.addStyles(
      editedCodeEntry.ast,
      editedCodeEntry,
      styleGroup.lookupId,
      styles
    );

    setCodeAstEdit(newAst, editedCodeEntry);
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

  const updateSelectedElementText = (newTextContent: string) => {
    if (!selectedElement) return;

    const selectedCodeId = project?.primaryElementEditor.getCodeIdFromLookupId(
      selectedElement.lookupId
    );
    if (!selectedCodeId) return;
    const codeEntry = project?.getCodeEntry(selectedCodeId);
    if (!codeEntry) return;

    // update text in ast
    const newAst = project?.primaryElementEditor.updateElementText(
      codeEntry.ast,
      codeEntry,
      selectedElement.lookupId,
      newTextContent
    );

    setCodeAstEdit(newAst, codeEntry);
  };

  const updateSelectedElementImage = (
    styleGroup: StyleGroup,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry
  ) => {
    if (!selectedElement) return;

    const selectedCodeId = project?.primaryElementEditor.getCodeIdFromLookupId(
      selectedElement.lookupId
    );
    if (!selectedCodeId) return;

    // get the ast editor for the style group
    const { editor } = styleGroup;

    // get the code entry to edit from the lookup id
    const editedCodeId = editor.getCodeIdFromLookupId(styleGroup.lookupId);
    const editedCodeEntry = project?.getCodeEntry(editedCodeId);
    if (!editedCodeEntry) return;

    // update image in ast
    const newAst = editor.updateElementImage(
      editedCodeEntry.ast,
      editedCodeEntry,
      selectedElement.lookupId,
      imageProp,
      assetEntry
    );

    setCodeAstEdit(newAst, editedCodeEntry);
  };

  const renderSelectBar = () => (
    <div className="flex justify-center items-center absolute bottom-0 left-0 right-0 p-1 bg-blue-600 text-white text-sm text-center">
      <div className="flex-1" />
      Select Mode
      <div className="flex-1" />
      <button
        className="btn py-1 px-4"
        onClick={() => setSelectMode(undefined)}
      >
        Cancel
      </button>
    </div>
  );

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
      updateSelectedElementText={updateSelectedElementText}
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
        addCodeEntry({ filePath, code, render: true, edit: false });
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
        addCodeEntry({ filePath, render: true, edit: true });
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
        setProject(project?.addAsset(file));
      }}
      onOpenProject={(p) => setProject(Project.createProject(p))}
      onSaveProject={() => project?.saveFiles()}
      onCloseProject={() => setProject(undefined)}
      toggleCodeEntryEdit={toggleCodeEntryEdit}
      toggleCodeEntryRender={toggleCodeEntryRender}
    />
  );

  const renderToolbar = ({ zoomIn, zoomOut, resetTransform }: any) => (
    <div className="flex absolute top-0 left-0 right-0 z-10">
      <div className="btngrp-h">
        <button
          className="btn px-4 rounded-l-none rounded-tr-none"
          onClick={() => setSelectMode({ type: SelectModeType.SelectElement })}
        >
          Select Element
        </button>
        {selectedElement && (
          <button
            className="btn px-4 rounded-tr-none"
            onClick={() => setSelectedElement(undefined)}
          >
            Clear Selected Element
          </button>
        )}
      </div>
      <div className="flex-1" />
      <div className="btngrp-h">
        <button className="btn px-4 rounded-tl-none" onClick={zoomIn}>
          +
        </button>
        <button className="btn px-4" onClick={zoomOut}>
          -
        </button>
        <button className="btn px-4 rounded-r-none" onClick={resetTransform}>
          x
        </button>
      </div>
    </div>
  );

  const renderComponentViews = () =>
    project?.codeEntries
      .filter((entry) => entry.render)
      .map((entry) => (
        <OverlayComponentView
          key={entry.id}
          compilerProps={{
            ref(componentView) {
              componentViews.current[entry.id] = componentView;
            },
            project,
            selectedCodeId: entry.id,
            onCompileEnd: onComponentViewCompiled,
          }}
          frameSize={frameSize}
          selectModeType={selectMode?.type}
          selectedElement={selectedElement}
          onSelectElement={onOverlaySelectElement}
          updateSelectedElementStyles={updateSelectedElementStyles}
        />
      ));

  return (
    <div className="flex flex-col items-stretch w-screen h-screen relative overflow-hidden text-white">
      <div className="flex flex-1 flex-row">
        <div
          className="flex flex-col p-4 pb-0 bg-gray-900 h-screen"
          style={{ width: "300px" }}
        >
          {renderSideBar()}
        </div>
        <div className="flex flex-1 relative bg-gray-600 items-center justify-center overflow-hidden">
          <TransformWrapper
            defaultScale={1}
            options={{
              minScale: 0.01,
              maxScale: 3,
              limitToBounds: false,
            }}
          >
            {(actions: any) => (
              <React.Fragment>
                {renderToolbar(actions)}
                <TransformComponent>
                  {renderComponentViews()}
                </TransformComponent>
              </React.Fragment>
            )}
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
                selectElement(newSelectedComponent as HTMLElement);
              }
            }}
          />
        )}
      </div>
      {selectMode !== undefined && renderSelectBar()}
    </div>
  );
}

export default App;
