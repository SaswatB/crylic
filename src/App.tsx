import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import MonacoEditor from "react-monaco-editor";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  CompilerComponentView,
  CompilerComponentViewRef,
  getComponentElementFromEvent,
} from "./components/CompilerComponentView";
import { useDebounce } from "./hooks/useDebounce";
import {
  DIV_LOOKUP_DATA_ATTR,
  DIV_LOOKUP_ROOT,
  DIV_RECENTLY_ADDED_DATA_ATTR,
  DIV_RECENTLY_ADDED,
  SelectModes,
} from "./utils/constants";
import {
  addLookupDataAttrToJSXElements,
  removeLookupDataAttrFromJSXElementsAndEditJSXElement,
  addJSXChildToJSXElement,
  removeRecentlyAddedDataAttrAndGetLookupId,
  applyStyleAttribute,
  getASTByLookupId,
  getJSXElementForSourceCodePosition,
} from "./utils/ast-utils";
import { useSideBar } from "./hooks/useSideBar";
import "./App.scss";

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
      if (DIV_LOOKUP_DATA_ATTR in (child as HTMLElement).dataset) {
        return [
          {
            tag: child.tagName,
            lookUpId: (child as HTMLElement).dataset[DIV_LOOKUP_DATA_ATTR]!,
            children: buildOutline(child),
          },
        ];
      }
      return buildOutline(child);
    })
    .reduce((p, c) => [...p, ...c], []);

function App() {
  const [code, setCode] = useState("");
  const [codeWithData, setCodeWithData] = useState("");
  const componentView = useRef<CompilerComponentViewRef>(null);

  const [debouncedCode, skipNextCodeDebounce] = useDebounce(code, 1000);
  useEffect(() => {
    try {
      setCodeWithData(addLookupDataAttrToJSXElements(debouncedCode));
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
    const lookUpId = componentElement.dataset?.[DIV_LOOKUP_DATA_ATTR];
    if (!lookUpId || lookUpId === DIV_LOOKUP_ROOT) return;

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

    const root = componentView.current?.getElementByLookupId(DIV_LOOKUP_ROOT);
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
              (componentElement as any).dataset?.[DIV_LOOKUP_DATA_ATTR]
            );
            selectElement(componentElement as HTMLElement);
          }
          break;
        case SelectModes.AddDivElement: {
          if (codeWithData === "") {
            setCodeImmediately(`import React from "react";

export function MyComponent() {
  return <div style={{ display: "flex", flex: 1 }} />;
}
`);
            setSelectMode(undefined);
            break;
          }

          const lookUpId = (componentElement as HTMLElement)?.dataset?.[
            DIV_LOOKUP_DATA_ATTR
          ];
          if (!lookUpId) break;

          let madeChange = false;
          const newCode = removeLookupDataAttrFromJSXElementsAndEditJSXElement(
            codeWithData,
            lookUpId,
            (path) => {
              addJSXChildToJSXElement(path.value, "div", {
                [`data-${DIV_RECENTLY_ADDED_DATA_ATTR}`]: DIV_RECENTLY_ADDED,
              });
              madeChange = true;
            }
          );

          if (madeChange) {
            const {
              code: newCode2,
              lookUpId: newChildLookUpId,
            } = removeRecentlyAddedDataAttrAndGetLookupId(newCode);

            if (newChildLookUpId) {
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

            setCodeImmediately(newCode2);
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
      let madeChange = false;
      const newCode = removeLookupDataAttrFromJSXElementsAndEditJSXElement(
        codeWithData,
        selectedElement.lookUpId,
        (path) => {
          applyStyleAttribute(path, { [styleProp]: newValue });
          madeChange = true;
        }
      );

      if (madeChange) {
        setCodeImmediately(newCode);
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
        path = getASTByLookupId(code, selectedElement.lookUpId);
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
          code,
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
            (newSelectedComponent as any).dataset?.[DIV_LOOKUP_DATA_ATTR]
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
                      code={codeWithData}
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
