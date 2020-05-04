import React, { useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
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
import {
  CodeEntry,
  OutlineElement,
  ProjectConfig,
  SelectedElement,
  Styles,
} from "./types/paint";
import {
  prettyPrintCodeEntryAST,
  printCodeEntryAST,
} from "./utils/ast/ast-helpers";
import { StyleGroup } from "./utils/ast/editors/ASTEditor";
import {
  CONFIG_FILE_NAME,
  getBoilerPlateComponent,
  SelectMode,
  SelectModeType,
} from "./utils/constants";
import { Project } from "./utils/Project";
import {
  getFriendlyName,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "./utils/utils";
import "./App.scss";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const path = __non_webpack_require__("path") as typeof import("path");

function App() {
  const { enqueueSnackbar } = useSnackbar();
  const componentViews = useRef<
    Record<string, CompilerComponentViewRef | null | undefined>
  >({});

  const [project, setProject] = useState<Project>();
  const openProject = (folderPath: string) => {
    let config;
    const fileCodeEntries: { filePath: string; code: string }[] = [];

    const configFilePath = path.join(folderPath, CONFIG_FILE_NAME);
    if (fs.existsSync(configFilePath)) {
      // todo use a more secure require/allow async
      config = pipe(
        configFilePath,
        __non_webpack_require__ as (p: string) => any,
        ProjectConfig.decode,
        fold(
          (e) => {
            console.log(e);
            return undefined;
          },
          (config) => config
        )
      );
    }
    const srcFilePath = path.join(folderPath, "src");
    if (fs.existsSync(srcFilePath)) {
      const read = (subFolderPath: string) =>
        fs.readdirSync(subFolderPath).forEach((file) => {
          const filePath = path.join(subFolderPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            read(filePath);
          } else if (
            (file.match(SCRIPT_EXTENSION_REGEX) ||
              file.match(STYLE_EXTENSION_REGEX)) &&
            !file.match(/\.(test|d)\.[jt]sx?$/)
          ) {
            fileCodeEntries.push({
              filePath,
              code: fs.readFileSync(filePath, { encoding: "utf-8" }),
            });
          }
        });
      // read all files under source
      read(srcFilePath);
    }

    setProject(
      new Project(folderPath, config).addCodeEntries(...fileCodeEntries)
    );
  };
  const setCode = (codeId: string, code: string) =>
    setProject(project?.editCodeEntry(codeId, { code }));
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

  const [selectMode, setSelectMode] = useState<SelectMode>(); // todo escape key
  const [selectedElement, setSelectedElement] = useState<SelectedElement>();

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
      styleGroups,
      computedStyles: window.getComputedStyle(componentElement),
      inlineStyles: componentElement.style,
    });
  };

  const [outline] = useState<OutlineElement[]>([]);
  const compileTasks = useRef<
    Record<
      string,
      ((getElementByLookupId: GetElementByLookupId) => void)[] | undefined
    >
  >({});
  const onComponentViewCompiled: OnCompileEndCallback = (
    codeId,
    { iframe, getElementByLookupId, onRoutesDefined, onRouteChange }
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

    // const root = getElementByLookupId(JSX_LOOKUP_ROOT);
    // if (root) setOutline(buildOutline(root));

    compileTasks.current[codeId]?.forEach((task) => task(getElementByLookupId));
    compileTasks.current[codeId] = [];

    const onRoutesDefinedSubscription = onRoutesDefined.subscribe((routes) =>
      console.log("onRoutesDefined", routes)
    );
    const onRouteChangeSubscription = onRouteChange.subscribe((routes) =>
      console.log("onRouteChange", routes)
    );
    return () => {
      onRoutesDefinedSubscription.unsubscribe();
      onRouteChangeSubscription.unsubscribe();
    };
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
    const editedCodeEntry = project?.codeEntries.find(
      (codeEntry) => codeEntry.id === editedCodeId
    );
    if (!editedCodeEntry) return;

    // add styles to the ast
    let newAst = editor.addStyles(
      editedCodeEntry.ast,
      editedCodeEntry,
      styleGroup.lookupId,
      styles
    );

    // remove lookup data from the ast and get the transformed code
    project?.getEditorsForCodeEntry(editedCodeEntry).forEach((editor) => {
      newAst = editor.removeLookupData(newAst, editedCodeEntry);
    });

    console.log("updateSelectedElementStyle change", styles, newAst);

    // save the edited code
    setCode(
      editedCodeEntry.id,
      prettyPrintCodeEntryAST(editedCodeEntry, newAst)
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

  const [frameSize, setFrameSize] = useState({ width: "600", height: "300" });
  const renderSideBar = () => (
    <SideBar
      outline={outline}
      project={project}
      selectedElement={selectedElement}
      onChangeSelectMode={setSelectMode}
      updateSelectedElementStyle={updateSelectedElementStyle}
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
        const filePath = path.join(
          project?.path || "/",
          `src/components/${name}.tsx`
        );
        const code = getBoilerPlateComponent(name);
        addCodeEntry({ filePath, code, render: true, edit: true });
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
        const filePath = path.join(
          project?.path || "/",
          `src/styles/${name}.css`
        );
        addCodeEntry({ filePath, render: true, edit: true });
        enqueueSnackbar("Started a new component!");
      }}
      onOpenProject={openProject}
      onSaveProject={() => {
        if (project) {
          project.codeEntries.forEach(({ filePath, code }) =>
            fs.writeFileSync(filePath, code)
          );
        } else {
          alert("please open a project before saving");
        }
      }}
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
      .map((entry, index) => (
        <div className="flex flex-col m-10">
          {getFriendlyName(project, entry.id)}
          <div className="flex relative bg-white shadow-2xl">
            <OverlayComponentView
              compilerProps={{
                ref(componentView) {
                  componentViews.current[entry.id] = componentView;
                },
                project,
                selectedCodeId: entry.id,
                onCompileEnd: onComponentViewCompiled,
                style: {
                  width: `${frameSize.width}px`,
                  height: `${frameSize.height}px`,
                },
              }}
              selectModeType={selectMode?.type}
              selectedElement={selectedElement}
              onSelectElement={onOverlaySelectElement}
              updateSelectedElementStyles={updateSelectedElementStyles}
            />
          </div>
        </div>
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
