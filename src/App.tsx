import React, { useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { CircularProgress } from "@material-ui/core";
import deepFreeze from "deep-freeze-strict";
import { produce } from "immer";
import { camelCase, cloneDeep, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import {
  CompilerComponentViewRef,
  GetElementByLookupId,
} from "./components/CompilerComponentView";
import { EditorPane } from "./components/EditorPane";
import { InputModal } from "./components/InputModal";
import { OverlayComponentView } from "./components/OverlayComponentView";
import { SideBar } from "./components/SideBar";
import { useDebounce } from "./hooks/useDebounce";
import {
  CodeEntry,
  CodeEntryLookupDataMap,
  OutlineElement,
  SelectedElement,
} from "./types/paint";
import {
  createLookupId,
  getCodeIdFromLookupId,
  hashString,
  parseAST,
  prettyPrintAST,
  printAST,
} from "./utils/ast-helpers";
import {
  addJSXChildToJSXElement,
  addLookupData,
  applyJSXInlineStyleAttribute,
  applyStyledStyleAttribute,
  editJSXElementByLookupId,
  editStyledTemplateByLookup,
  removeLookupData,
  removeRecentlyAddedDataAttrAndGetLookupId,
  Styles,
} from "./utils/ast-parsers";
import {
  getBoilerPlateComponent,
  JSX_LOOKUP_DATA_ATTR,
  JSX_LOOKUP_ROOT,
  JSX_RECENTLY_ADDED,
  JSX_RECENTLY_ADDED_DATA_ATTR,
  SelectModes,
  STYLED_LOOKUP_CSS_VAR_PREFIX,
} from "./utils/constants";
import { getFriendlyName } from "./utils/utils";
import "./App.scss";

const fs = __non_webpack_require__("fs") as typeof import("fs");

function App() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [debouncedLoading, skipLoadingDebounce] = useDebounce(loading, 700);
  const [codeEntriesLookupData, setCodeEntriesLookupData] = useState<
    CodeEntryLookupDataMap
  >({});
  const componentViews = useRef<
    Record<string, CompilerComponentViewRef | null | undefined>
  >({});

  const [codeEntries, setCodeEntries] = useState<CodeEntry[]>([]);
  const setCode = (codeId: string, code: string) =>
    setCodeEntries(
      produce((draft: CodeEntry[]) => {
        (
          draft.find((entry) => entry.id === codeId) ||
          ({} as Partial<CodeEntry>)
        ).code = code;
      })
    );
  const addCodeEntry = (
    partialEntry: Partial<CodeEntry> & { filePath: string }
  ) => {
    setCodeEntries(
      produce((draft: CodeEntry[]) => {
        draft.push({
          id: hashString(partialEntry.filePath),
          code: "",
          ...partialEntry,
        });
      })
    );
  };
  const codeTransformer = (codeEntry: CodeEntry) => {
    const res = addLookupData(parseAST(codeEntry.code), codeEntry.id);
    console.log("codeTransformer", res.ast);
    setCodeEntriesLookupData(
      produce((draft) => {
        draft[codeEntry.id] = {
          ...res,
          ast: deepFreeze(cloneDeep(res.ast)),
        };
      })
    );
    return printAST(res.ast);
  };

  const [selectMode, setSelectMode] = useState<SelectModes>(); // todo escape key
  const [selectedElement, setSelectedElement] = useState<SelectedElement>();

  const selectElement = (componentElement: HTMLElement) => {
    const lookupId = componentElement.dataset?.[JSX_LOOKUP_DATA_ATTR];
    if (!lookupId || lookupId === JSX_LOOKUP_ROOT) return;

    setSelectedElement({
      lookupId,
      computedStyles: window.getComputedStyle(componentElement),
      inlineStyles: componentElement.style,
    });
  };

  const [outline, setOutline] = useState<OutlineElement[]>([]);
  const compileTasks = useRef<
    Record<
      string,
      ((getElementByLookupId: GetElementByLookupId) => void)[] | undefined
    >
  >({});
  const onComponentViewCompiled = (
    codeId: string,
    getElementByLookupId: GetElementByLookupId
  ) => {
    skipLoadingDebounce();
    setLoading(false);
    if (
      selectedElement &&
      getCodeIdFromLookupId(selectedElement.lookupId) === codeId
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
    switch (selectMode) {
      default:
      case SelectModes.SelectElement:
        console.log(
          "setting selected from manual selection",
          (componentElement as HTMLElement).dataset?.[JSX_LOOKUP_DATA_ATTR]
        );
        selectElement(componentElement);
        break;
      case SelectModes.AddElement: {
        const lookupId = componentElement.dataset?.[JSX_LOOKUP_DATA_ATTR];
        if (!lookupId) break;

        const codeId = getCodeIdFromLookupId(lookupId);
        const lookupData = codeEntriesLookupData[codeId];
        if (!lookupData) break;

        let madeChange = false;
        const newAst = removeLookupData(
          editJSXElementByLookupId(lookupData.ast, lookupId, (path) => {
            addJSXChildToJSXElement(path.value, "div", {
              [`data-${JSX_RECENTLY_ADDED_DATA_ATTR}`]: JSX_RECENTLY_ADDED,
              style: { display: "flex" },
            });
            madeChange = true;
          })
        );

        if (madeChange) {
          const {
            ast: newAst2,
            resultIndex: newChildLookupIndex,
          } = removeRecentlyAddedDataAttrAndGetLookupId(newAst);

          if (newChildLookupIndex !== undefined) {
            const newChildLookupId = createLookupId(
              codeId,
              newChildLookupIndex
            );
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

          setCode(codeId, prettyPrintAST(newAst2));
        }
        break;
      }
    }

    setSelectMode(undefined);
  };

  const updateSelectedElementStyles = (styles: Styles, preview?: boolean) => {
    if (!selectedElement) return;

    const componentView =
      componentViews.current[getCodeIdFromLookupId(selectedElement.lookupId)];
    componentView?.addTempStyles(selectedElement.lookupId, styles, !preview);
    // preview is a flag used to quickly show updates in the dom
    // there shouldn't be any expensive calculations done when it's on
    // such as changing state or parsing ast
    if (preview) return;

    const codeId = getCodeIdFromLookupId(selectedElement.lookupId);
    const lookupData = codeEntriesLookupData[codeId];
    const selectedComponent = componentView?.getElementByLookupId(
      selectedElement.lookupId
    );
    const selectedComponentStyledLookupId =
      selectedComponent &&
      lookupData?.styledElementLookupIds.find((lookupId) => {
        return !!window
          .getComputedStyle(selectedComponent)
          .getPropertyValue(`${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookupId}`);
      });

    console.log(
      "updateSelectedElementStyles",
      styles,
      selectedElement,
      lookupData
    );
    let madeChange = false;
    const newAst = removeLookupData(
      selectedComponentStyledLookupId
        ? editStyledTemplateByLookup(
            lookupData!.ast,
            selectedComponentStyledLookupId,
            (path) => {
              applyStyledStyleAttribute(path, styles);
              madeChange = true;
            }
          )
        : editJSXElementByLookupId(
            lookupData!.ast,
            selectedElement.lookupId,
            (path) => {
              applyJSXInlineStyleAttribute(path, styles);
              madeChange = true;
            }
          )
    );
    console.log(
      "updateSelectedElementStyle change",
      madeChange,
      styles,
      lookupData!.ast,
      newAst
    );

    if (madeChange) {
      setCode(codeId, prettyPrintAST(newAst));
    }
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
      codeEntries={codeEntries}
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
        const name = upperFirst(camelCase(inputName));
        const filePath = `/src/styles/${name}.css`;
        addCodeEntry({ filePath });
        enqueueSnackbar("Started a new component!");
      }}
      onOpenFile={(filePath) => {
        // todo handle file not found or reopening an open file
        const code = fs.readFileSync(filePath, { encoding: "utf-8" });
        addCodeEntry({ filePath, code });
      }}
      onSaveFile={() => {
        if (codeEntries.length) {
          codeEntries.forEach(({ filePath, code }) =>
            fs.writeFileSync(filePath, code)
          );
        } else {
          alert("please open a file before saving");
        }
      }}
    />
  );

  const renderToolbar = ({ zoomIn, zoomOut, resetTransform }: any) => (
    <div className="flex absolute top-0 left-0 right-0 z-10">
      <div className="btngrp-h">
        <button
          className="btn px-4 rounded-l-none rounded-tr-none"
          onClick={() => setSelectMode(SelectModes.SelectElement)}
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

  return (
    <div className="flex flex-col items-stretch w-screen h-screen relative overflow-hidden text-white">
      <div className="flex flex-1 flex-row">
        <div
          className="flex flex-col p-4 bg-gray-900 h-screen"
          style={{ width: "300px" }}
        >
          {renderSideBar()}
        </div>
        <div className="flex flex-1 relative bg-gray-600 items-center justify-center overflow-hidden">
          {debouncedLoading && (
            <div className="flex items-center justify-center absolute inset-0 z-20 dark-glass">
              <CircularProgress />
            </div>
          )}
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
                  {codeEntries
                    .filter((entry) => entry.filePath.match(/\.(jsx?|tsx?)$/))
                    .map((entry, index) => (
                      <div className="flex flex-col m-10">
                        {getFriendlyName(codeEntries, index)}
                        <div className="flex relative bg-white shadow-2xl">
                          <OverlayComponentView
                            compilerProps={{
                              ref(componentView) {
                                componentViews.current[
                                  entry.id
                                ] = componentView;
                              },
                              codeEntries: codeEntries,
                              selectedCodeId: entry.id,
                              codeTransformer: codeTransformer,
                              onCompileStart: () => setLoading(true),
                              onCompileEnd: onComponentViewCompiled,
                              style: {
                                width: `${frameSize.width}px`,
                                height: `${frameSize.height}px`,
                              },
                            }}
                            selectMode={selectMode}
                            selectedElement={selectedElement}
                            onSelectElement={onOverlaySelectElement}
                            updateSelectedElementStyles={
                              updateSelectedElementStyles
                            }
                          />
                        </div>
                      </div>
                    ))}
                </TransformComponent>
              </React.Fragment>
            )}
          </TransformWrapper>
        </div>
        <EditorPane
          codeEntries={codeEntries}
          onCodeChange={(codeId, newCode) => {
            setSelectedElement(undefined); // todo look into keeping the element selected, if possible
            setCode(codeId, newCode);
          }}
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
                (newSelectedComponent as any).dataset?.[JSX_LOOKUP_DATA_ATTR]
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
