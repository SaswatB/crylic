import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import MonacoEditor from "react-monaco-editor";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { CircularProgress } from "@material-ui/core";
import { namedTypes as t } from "ast-types";
import {
  CompilerComponentView,
  CompilerComponentViewRef,
  getComponentElementFromEvent,
} from "./components/CompilerComponentView";
import { useDebounce } from "./hooks/useDebounce";
import {
  JSX_LOOKUP_DATA_ATTR,
  JSX_LOOKUP_ROOT,
  JSX_RECENTLY_ADDED_DATA_ATTR,
  JSX_RECENTLY_ADDED,
  SelectModes,
  STYLED_LOOKUP_CSS_VAR_PREFIX,
} from "./utils/constants";
import {
  addLookupData,
  addJSXChildToJSXElement,
  removeRecentlyAddedDataAttrAndGetLookupId,
  applyJSXInlineStyleAttribute,
  getJSXASTByLookupId,
  getJSXElementForSourceCodePosition,
  AddLookupDataResult,
  applyStyledStyleAttribute,
  editJSXElementByLookup,
  removeLookupData,
  editStyledTemplateByLookup,
} from "./utils/ast-parsers";
import { useSideBar } from "./hooks/useSideBar";
import "./App.scss";
import { parseAST, printAST, prettyPrintAST } from "./utils/ast-helpers";

const fs = __non_webpack_require__("fs") as typeof import("fs");

function useOverlay(
  componentView: CompilerComponentViewRef | null,
  selectionBox?: DOMRect,
  selectEnabled?: boolean,
  onSelect?: (componentElement: Element | null | undefined) => void
) {
  const [highlightBox, setHighlightBox] = useState<DOMRect>();
  const onOverlayMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElement = getComponentElementFromEvent(event, componentView);
    setHighlightBox(componentElement?.getBoundingClientRect());
  };
  const onOverlayClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElement = getComponentElementFromEvent(event, componentView);
    onSelect?.(componentElement);
  };

  const activeHighLightBox = (selectEnabled && highlightBox) || selectionBox;
  const renderOverlay = () => (
    <div
      className="absolute inset-0"
      onMouseMove={selectEnabled ? onOverlayMove : undefined}
      onMouseLeave={() => setHighlightBox(undefined)}
      onClick={selectEnabled ? onOverlayClick : undefined}
    >
      {activeHighLightBox && (
        <div
          className="absolute border-blue-300 border-solid pointer-events-none"
          style={{
            top: activeHighLightBox.top,
            left: activeHighLightBox.left,
            width: activeHighLightBox.width,
            height: activeHighLightBox.height,
            borderWidth: selectEnabled && highlightBox ? "4px" : "2px",
          }}
        />
      )}
    </div>
  );
  return renderOverlay;
}

export interface SelectedElement {
  lookUpId: string;
  boundingBox: DOMRect;
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
}

export interface OutlineElement {
  tag: string;
  lookUpId: string;
  children: OutlineElement[];
}

const buildOutline = (element: Element): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      if (JSX_LOOKUP_DATA_ATTR in (child as HTMLElement).dataset) {
        return [
          {
            tag: child.tagName,
            lookUpId: (child as HTMLElement).dataset[JSX_LOOKUP_DATA_ATTR]!,
            children: buildOutline(child),
          },
        ];
      }
      return buildOutline(child);
    })
    .reduce((p, c) => [...p, ...c], []);

function App() {
  const [loading, setLoading] = useState(false);
  const [debouncedLoading] = useDebounce(loading, 300);
  const [code, setCode] = useState("");
  const [codeWithLookupData, setCodeWithLookupData] = useState<
    AddLookupDataResult & { ast: t.File; transformedCode: string }
  >();
  const componentView = useRef<CompilerComponentViewRef>(null);

  const [debouncedCode, skipNextCodeDebounce] = useDebounce(code, 1000);
  useEffect(() => {
    try {
      const res = addLookupData(parseAST(debouncedCode));
      const transformedCode = printAST(res.ast);
      setCodeWithLookupData({ transformedCode, ...res, ast: Object.freeze(res.ast) });
      setLoading(true);
    } catch (e) {
      console.log(e);
    }
  }, [debouncedCode]);

  const setCodeImmediately = (newCode: string) => {
    skipNextCodeDebounce();
    setCode(newCode);
  };

  const [selectMode, setSelectMode] = useState<SelectModes>(); // todo escape key
  const [selectedElement, setSelectedElement] = useState<SelectedElement>();

  const selectElement = (componentElement: HTMLElement) => {
    const lookUpId = componentElement.dataset?.[JSX_LOOKUP_DATA_ATTR];
    if (!lookUpId || lookUpId === JSX_LOOKUP_ROOT) return;

    setSelectedElement({
      lookUpId,
      boundingBox: componentElement.getBoundingClientRect(),
      computedStyles: window.getComputedStyle(componentElement),
      inlineStyles: componentElement.style,
    });
  };

  const [outline, setOutline] = useState<OutlineElement[]>([]);
  const compileTasks = useRef<Function[]>([]);
  const onComponentViewCompiled = () => {
    setLoading(false);
    if (selectedElement) {
      const newSelectedComponent = componentView.current?.getElementByLookupId(
        selectedElement.lookUpId
      );
      if (newSelectedComponent) {
        console.log(
          "setting selected element post-compile",
          selectedElement.lookUpId
        );
        selectElement(newSelectedComponent as HTMLElement);
      } else {
        setSelectedElement(undefined);
      }
    }

    const root = componentView.current?.getElementByLookupId(JSX_LOOKUP_ROOT);
    if (root) setOutline(buildOutline(root));

    compileTasks.current.forEach((task) => task());
    compileTasks.current = [];
  };

  const renderOverlay = useOverlay(
    componentView.current,
    selectedElement?.boundingBox,
    selectMode !== undefined,
    (componentElement) => {
      switch (selectMode) {
        case SelectModes.SelectElement:
          if (componentElement) {
            console.log(
              "setting selected from manual selection",
              (componentElement as any).dataset?.[JSX_LOOKUP_DATA_ATTR]
            );
            selectElement(componentElement as HTMLElement);
          }
          break;
        case SelectModes.AddDivElement: {
          if (!code.trim()) {
            setCodeImmediately(`import React from "react";

export function MyComponent() {
  return <div style={{ height: "100%" }} />;
}
`);
            setSelectMode(undefined);
            break;
          }

          const lookUpId = (componentElement as HTMLElement)?.dataset?.[
            JSX_LOOKUP_DATA_ATTR
          ];
          if (!lookUpId || !codeWithLookupData) break;

          let madeChange = false;
          const newAst = removeLookupData(editJSXElementByLookup(
            codeWithLookupData.ast,
            lookUpId,
            (path) => {
              addJSXChildToJSXElement(path.value, "div", {
                [`data-${JSX_RECENTLY_ADDED_DATA_ATTR}`]: JSX_RECENTLY_ADDED,
              });
              madeChange = true;
            }
          ));

          if (madeChange) {
            const {
              ast: newAst2,
              resultId: newChildLookUpId,
            } = removeRecentlyAddedDataAttrAndGetLookupId(newAst);

            if (newChildLookUpId) {
              // try to select the newly added element when the CompilerComponentView next compiles
              compileTasks.current.push(() => {
                const newChildComponent = componentView.current?.getElementByLookupId(
                  newChildLookUpId!
                );
                if (newChildComponent) {
                  console.log(
                    "setting selected element through post-child add",
                    newChildLookUpId
                  );
                  selectElement(newChildComponent as HTMLElement);
                }
              });
            }

            setCodeImmediately(prettyPrintAST(newAst2));
          }
          break;
        }
      }

      setSelectMode(undefined);
    }
  );

  const updateSelectedElementStyleFactory = (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string
  ) => () => {
    if (
      selectedElement &&
      newValue !== selectedElement?.computedStyles[styleProp]
    ) {
      const selectedComponent = componentView.current?.getElementByLookupId(
        selectedElement.lookUpId
      );
      const selectedComponentStyledLookupId =
        selectedComponent &&
        codeWithLookupData?.styledElementLookupIds.find((lookUpId) => {
          return !!window
            .getComputedStyle(selectedComponent)
            .getPropertyValue(`${STYLED_LOOKUP_CSS_VAR_PREFIX}${lookUpId}`);
        });

      let madeChange = false;
      const newAst = removeLookupData(selectedComponentStyledLookupId
        ? editStyledTemplateByLookup(
            codeWithLookupData!.ast,
            selectedComponentStyledLookupId,
            (path) => {
              applyStyledStyleAttribute(path, { [styleProp]: newValue });
              madeChange = true;
            }
          )
        : editJSXElementByLookup(
            codeWithLookupData!.ast,
            selectedElement.lookUpId,
            (path) => {
              applyJSXInlineStyleAttribute(path, { [styleProp]: newValue });
              madeChange = true;
            }
          ));

      if (madeChange) {
        setCodeImmediately(prettyPrintAST(newAst));
      }
    }
  };

  const {
    render: renderSideBar,
    filePath,
    componentViewWidth,
    componentViewHeight,
  } = useSideBar({
    outline,
    selectedElement,
    onChangeSelectMode: setSelectMode,
    onClearSelectedElement: () => setSelectedElement(undefined),
    updateSelectedElementStyleFactory,
    onSaveCode: () => {
      if (filePath) fs.writeFileSync(filePath, code);
      else alert("please open a file before saving");
    },
  });

  const activeHighlight = useRef<string[]>([]);
  const editorRef = useRef<MonacoEditor>(null);
  useEffect(() => {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (selectedElement) {
      let path;
      try {
        path = getJSXASTByLookupId(parseAST(code), selectedElement.lookUpId);
      } catch (err) {}
      const { start: openStart, end: openEnd } =
        path?.value?.openingElement?.name?.loc || {};
      if (openStart && openEnd) {
        decorations.push({
          range: new monaco.Range(
            openStart.line,
            openStart.column + 1,
            openEnd.line,
            openEnd.column + 1
          ),
          options: { inlineClassName: "selected-element-code-highlight" },
        });
        editorRef.current?.editor?.revealPositionInCenter({
          lineNumber: openStart.line,
          column: openStart.column + 1,
        });
      }
      const { start: closeStart, end: closeEnd } =
        path?.value?.closingElement?.name?.loc || {};
      if (closeStart && closeEnd) {
        decorations.push({
          range: new monaco.Range(
            closeStart.line,
            closeStart.column + 1,
            closeEnd.line,
            closeEnd.column + 1
          ),
          options: { inlineClassName: "selected-element-code-highlight" },
        });
      }
    }
    activeHighlight.current =
      editorRef.current?.editor?.deltaDecorations(
        activeHighlight.current,
        decorations
      ) || [];
  }, [code, selectedElement]);
  useEffect(() => {
    return editorRef.current?.editor?.onDidChangeCursorPosition((e) => {
      if (!editorRef.current?.editor?.hasTextFocus()) return;

      let lookUpId;
      try {
        ({ lookUpId } = getJSXElementForSourceCodePosition(
          parseAST(code),
          e.position.lineNumber,
          e.position.column
        ));
      } catch (err) {}

      if (lookUpId !== undefined) {
        const newSelectedComponent = componentView.current?.getElementByLookupId(
          lookUpId
        );
        if (newSelectedComponent) {
          console.log(
            "setting selected element through editor cursor update",
            (newSelectedComponent as any).dataset?.[JSX_LOOKUP_DATA_ATTR]
          );
          selectElement(newSelectedComponent as HTMLElement);
        }
      }
    }).dispose;
  }, [code]);

  useEffect(() => {
    if (filePath) {
      fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
        setCodeImmediately(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  return (
    <div className="flex flex-col items-stretch w-screen h-screen overflow-hidden text-white">
      {selectMode !== undefined && (
        <div className="flex justify-center items-center w-full p-1 bg-blue-600 text-white text-sm text-center">
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
      )}
      <div className="flex flex-1 flex-row">
        <div
          className="flex flex-col p-4 bg-gray-800"
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
            {({ zoomIn, zoomOut, resetTransform }: any) => (
              <React.Fragment>
                <div className="flex absolute top-0 left-0 right-0 z-10">
                  <button
                    className="btn"
                    onClick={() => setSelectMode(SelectModes.SelectElement)}
                  >
                    Select Element
                  </button>
                  {selectedElement && (
                    <button
                      className="btn"
                      onClick={() => setSelectedElement(undefined)}
                    >
                      Clear Selected Element
                    </button>
                  )}
                  <div className="flex-1" />
                  <button className="btn" onClick={zoomIn}>
                    +
                  </button>
                  <button className="btn" onClick={zoomOut}>
                    -
                  </button>
                  <button className="btn" onClick={resetTransform}>
                    x
                  </button>
                </div>
                <TransformComponent>
                  <div className="flex m-12 relative bg-white shadow-2xl">
                    <CompilerComponentView
                      ref={componentView}
                      code={codeWithLookupData?.transformedCode || ""}
                      filePath={filePath}
                      onCompiled={onComponentViewCompiled}
                      style={{
                        width: `${componentViewWidth}px`,
                        height: `${componentViewHeight}px`,
                      }}
                    />
                    {(selectMode !== undefined || selectedElement) &&
                      renderOverlay()}
                  </div>
                </TransformComponent>
              </React.Fragment>
            )}
          </TransformWrapper>
        </div>
        <MonacoEditor
          ref={editorRef}
          language="javascript"
          theme="vs-dark"
          width="600px"
          value={code}
          onChange={(code) => {
            setSelectedElement(undefined); // todo look into keeping the element selected if possible
            setCode(code);
          }}
        />
        {/* <MonacoEditor
          language="javascript"
          theme="vs-dark"
          value={transformedCode}
        /> */}
      </div>
    </div>
  );
}

export default App;
