import React, { useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import deepFreeze from "deep-freeze-strict";
import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import gonzales from "gonzales-pe";
import { produce } from "immer";
import { camelCase, cloneDeep, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import {
  CompilerComponentViewRef,
  GetElementByLookupId,
} from "./components/CompilerComponentView";
import { EditorPane } from "./components/EditorPane/EditorPane";
import { InputModal } from "./components/InputModal";
import { OverlayComponentView } from "./components/OverlayComponentView";
import { SideBar } from "./components/SideBar";
import {
  CodeEntry,
  CodeEntryLookupDataMap,
  OutlineElement,
  Project,
  ProjectConfig,
  SelectedElement,
  Styles,
} from "./types/paint";
import {
  hashString,
  parseAST,
  prettyPrintAST,
  prettyPrintStyleSheetAST,
  printAST,
} from "./utils/ast/ast-helpers";
import { JSXASTEditor } from "./utils/ast/editors/JSXASTEditor";
import { StyledASTEditor } from "./utils/ast/editors/StyledASTEditor";
import { StyleSheetASTEditor } from "./utils/ast/editors/StyleSheetASTEditor";
import {
  CONFIG_FILE_NAME,
  getBoilerPlateComponent,
  SelectMode,
  SelectModeType,
} from "./utils/constants";
import { getFriendlyName, isScriptEntry, isStyleEntry } from "./utils/utils";
import "./App.scss";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const path = __non_webpack_require__("path") as typeof import("path");

const elementEditor = new JSXASTEditor();
const styledEditor = new StyledASTEditor();
const styleSheetEditor = new StyleSheetASTEditor();

const createCodeEntry = (
  partialEntry: Partial<CodeEntry> & { filePath: string }
) => ({
  id: hashString(partialEntry.filePath),
  code: "",
  edit: true,
  render: true,
  ...partialEntry,
});

function App() {
  const { enqueueSnackbar } = useSnackbar();
  const [codeEntriesLookupData, setCodeEntriesLookupData] = useState<
    CodeEntryLookupDataMap
  >({});
  const componentViews = useRef<
    Record<string, CompilerComponentViewRef | null | undefined>
  >({});

  const [project, setProject] = useState<Project>();
  const openProject = (folderPath: string) => {
    let config;
    const codeEntries: CodeEntry[] = [];

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
          } else if (!file.match(/.test.(j|t)sx?$/)) {
            codeEntries.push(
              createCodeEntry({
                filePath,
                code: fs.readFileSync(filePath, { encoding: "utf-8" }),
                edit: false,
                render: false,
              })
            );
          }
        });
      // read all files under source
      read(srcFilePath);
    }

    setProject({
      path: folderPath,
      config,
      codeEntries: codeEntries,
    });
  };
  const setCode = (codeId: string, code: string) =>
    setProject(
      produce((draft: Project | undefined) => {
        (
          draft?.codeEntries.find((entry) => entry.id === codeId) ||
          ({} as Partial<CodeEntry>)
        ).code = code;
      })
    );
  const toggleCodeEntryEdit = (codeId: string) => {
    setProject(
      produce((draft: Project | undefined) => {
        const codeEntry =
          draft?.codeEntries.find((entry) => entry.id === codeId) ||
          ({} as Partial<CodeEntry>);
        codeEntry.edit = !codeEntry.edit;
      })
    );
  };
  const addCodeEntry = (
    partialEntry: Parameters<typeof createCodeEntry>[0]
  ) => {
    setProject(
      produce((draft: Project | undefined) => {
        draft?.codeEntries.push(createCodeEntry(partialEntry));
      })
    );
  };
  const codeTransformer = (codeEntry: CodeEntry) => {
    let finalAst: unknown;
    let transformedCode;
    if (isStyleEntry(codeEntry)) {
      let ast = gonzales.parse(codeEntry.code);
      ({ ast } = styleSheetEditor.addLookupData(ast, codeEntry));
      transformedCode = ast.toString() || "";
      finalAst = ast;
    } else if (isScriptEntry(codeEntry)) {
      let ast = parseAST(codeEntry.code);
      ({ ast } = elementEditor.addLookupData(ast, codeEntry));
      ({ ast } = styledEditor.addLookupData(ast, codeEntry));
      transformedCode = printAST(ast);
      finalAst = ast;
    } else {
      return codeEntry.code;
    }

    console.log("codeTransformer", finalAst);
    setCodeEntriesLookupData(
      produce((draft) => {
        draft[codeEntry.id] = {
          ast: deepFreeze(cloneDeep(finalAst)),
        };
      })
    );
    return transformedCode;
  };

  const [selectMode, setSelectMode] = useState<SelectMode>(); // todo escape key
  const [selectedElement, setSelectedElement] = useState<SelectedElement>();

  const selectElement = (componentElement: HTMLElement) => {
    const [lookupId] = elementEditor.getLookupIdsFromHTMLElement(
      componentElement
    );
    if (!lookupId) return;

    setSelectedElement({
      lookupId,
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
  const onComponentViewCompiled = (
    codeId: string,
    {
      iframe,
      getElementByLookupId,
    }: {
      iframe: HTMLIFrameElement;
      getElementByLookupId: GetElementByLookupId;
    }
  ) => {
    styledEditor.onASTRender(iframe);
    styleSheetEditor.onASTRender(iframe);

    if (
      selectedElement &&
      elementEditor.getCodeIdFromLookupId(selectedElement.lookupId) === codeId
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
          elementEditor.getLookupIdsFromHTMLElement(
            componentElement as HTMLElement
          )[0]
        );
        selectElement(componentElement);
        break;
      case SelectModeType.AddElement: {
        const lookupId = elementEditor.getLookupIdsFromHTMLElement(
          componentElement
        )[0];
        if (!lookupId) break;

        const codeId = elementEditor.getCodeIdFromLookupId(lookupId);
        const codeEntry = project?.codeEntries.find(
          (codeEntry) => codeEntry.id === codeId
        );
        const lookupData = codeEntriesLookupData[codeId];
        if (!codeEntry || !lookupData) break;

        let newAst = elementEditor.addChildToElement(
          lookupData.ast,
          codeEntry,
          lookupId,
          selectMode.tag,
          selectMode.attributes
        );
        const [newChildLookupId] = elementEditor.getRecentlyAddedElements(
          newAst,
          codeEntry
        );

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

        newAst = elementEditor.removeLookupData(newAst, codeEntry);
        newAst = styledEditor.removeLookupData(newAst, codeEntry);
        setCode(codeId, prettyPrintAST(newAst));
        break;
      }
    }

    setSelectMode(undefined);
  };

  const updateSelectedElementStyles = (styles: Styles, preview?: boolean) => {
    if (!selectedElement) return;

    const selectedCodeId = elementEditor.getCodeIdFromLookupId(
      selectedElement.lookupId
    );
    const componentView = componentViews.current[selectedCodeId];
    componentView?.addTempStyles(selectedElement.lookupId, styles, !preview);
    // preview is a flag used to quickly show updates in the dom
    // there shouldn't be any expensive calculations done when it's on
    // such as changing state or parsing ast
    if (preview) return;

    const selectedComponent = componentView?.getElementByLookupId(
      selectedElement.lookupId
    );
    const selectedComponentStyleSheetLookupId =
      selectedComponent &&
      styleSheetEditor.getLookupIdsFromHTMLElement(selectedComponent)[0];
    const selectedComponentStyledLookupId =
      selectedComponent &&
      styledEditor.getLookupIdsFromHTMLElement(selectedComponent)[0];

    let edittedCodeEntry;
    let newAst: any;
    if (selectedComponentStyleSheetLookupId) {
      const edittedCodeId = styledEditor.getCodeIdFromLookupId(
        selectedComponentStyleSheetLookupId
      );
      edittedCodeEntry = project?.codeEntries.find(
        (codeEntry) => codeEntry.id === edittedCodeId
      );
      const lookupData = codeEntriesLookupData[edittedCodeId];
      if (!edittedCodeEntry || !lookupData) return;

      newAst = styleSheetEditor.addStyles(
        lookupData.ast,
        edittedCodeEntry,
        selectedComponentStyleSheetLookupId,
        styles
      );
    } else if (selectedComponentStyledLookupId) {
      const edittedCodeId = styledEditor.getCodeIdFromLookupId(
        selectedComponentStyledLookupId
      );
      edittedCodeEntry = project?.codeEntries.find(
        (codeEntry) => codeEntry.id === edittedCodeId
      );
      const lookupData = codeEntriesLookupData[edittedCodeId];
      if (!edittedCodeEntry || !lookupData) return;

      newAst = styledEditor.addStyles(
        lookupData.ast,
        edittedCodeEntry,
        selectedComponentStyledLookupId,
        styles
      );
    } else {
      edittedCodeEntry = project?.codeEntries.find(
        (codeEntry) => codeEntry.id === selectedCodeId
      );
      const lookupData = codeEntriesLookupData[selectedCodeId];
      if (!edittedCodeEntry || !lookupData) return;

      newAst = elementEditor.addStyles(
        lookupData.ast,
        edittedCodeEntry,
        selectedElement.lookupId,
        styles
      );
    }

    let transformedCode;
    if (isStyleEntry(edittedCodeEntry)) {
      newAst = styleSheetEditor.removeLookupData(newAst, edittedCodeEntry);
      transformedCode = prettyPrintStyleSheetAST(newAst);
    } else {
      newAst = elementEditor.removeLookupData(newAst, edittedCodeEntry);
      newAst = styledEditor.removeLookupData(newAst, edittedCodeEntry);
      transformedCode = prettyPrintAST(newAst);
    }

    console.log("updateSelectedElementStyle change", styles, newAst);

    setCode(edittedCodeEntry.id, transformedCode);
  };

  const updateSelectedElementStyle = (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string,
    preview?: boolean
  ) => {
    if (
      selectedElement &&
      newValue !== selectedElement?.computedStyles[styleProp]
    ) {
      updateSelectedElementStyles(
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
        const filePath = `/src/components/${name}.tsx`;
        const code = getBoilerPlateComponent(name);
        addCodeEntry({ filePath, code });
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
        const filePath = `/src/styles/${name}.css`;
        addCodeEntry({ filePath });
        enqueueSnackbar("Started a new component!");
      }}
      onOpenProject={openProject}
      onOpenFile={(filePath) => {
        // todo handle file not found or reopening an open file
        const code = fs.readFileSync(filePath, { encoding: "utf-8" });
        addCodeEntry({ filePath, code });
      }}
      onSaveFile={() => {
        if (project?.codeEntries.length) {
          project.codeEntries.forEach(({ filePath, code }) =>
            fs.writeFileSync(filePath, code)
          );
        } else {
          alert("please open a file before saving");
        }
      }}
      toggleCodeEntryEdit={toggleCodeEntryEdit}
      toggleCodeEntryRender={(codeId) => {
        setProject(
          produce((draft: Project | undefined) => {
            const codeEntry =
              draft?.codeEntries.find((entry) => entry.id === codeId) ||
              ({} as Partial<CodeEntry>);
            codeEntry.render = !codeEntry.render;
          })
        );
      }}
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
                codeTransformer,
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
        <EditorPane
          project={project}
          onCodeChange={(codeId, newCode) => {
            setSelectedElement(undefined);
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
                elementEditor.getLookupIdsFromHTMLElement(
                  newSelectedComponent as HTMLElement
                )[0]
              );
              selectElement(newSelectedComponent as HTMLElement);
            }
          }}
        />
      </div>
      {selectMode !== undefined && renderSelectBar()}
    </div>
  );
}

export default App;
