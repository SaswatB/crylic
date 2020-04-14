import React, { useState, useEffect, useRef, useMemo } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import MonacoEditor from "react-monaco-editor";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { CircularProgress } from "@material-ui/core";
import { namedTypes as t } from "ast-types";
import { cloneDeep } from "lodash";
import deepFreeze from "deep-freeze-strict";
import { Rnd, DraggableData } from "react-rnd";
import { produce } from 'immer';
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
  BOILER_PLATE_CODE,
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
  Styles,
} from "./utils/ast-parsers";
import { useSideBar } from "./hooks/useSideBar";
import "./App.scss";
import { parseAST, printAST, prettyPrintAST } from "./utils/ast-helpers";
import { useSnackbar } from "notistack";

const fs = __non_webpack_require__("fs") as typeof import("fs");

let lastDragResizeHandled = 0;
function useOverlay(
  componentView: CompilerComponentViewRef | null,
  selectedElement?: SelectedElement,
  selectMode?: SelectModes,
  onSelect?: (componentElement: Element | null | undefined) => void,
  onMoveResizeSelection?: (
    deltaX: number | undefined,
    deltaY: number | undefined,
    width: string | undefined,
    height: string | undefined
  ) => void
) {
  const [highlightBox, setHighlightBox] = useState<DOMRect>();
  const onOverlayMove = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const componentElement = getComponentElementFromEvent(event, componentView);
    const lookUpId = (componentElement as HTMLElement)?.dataset[
      JSX_LOOKUP_DATA_ATTR
    ];
    if (
      lookUpId &&
      (selectMode !== SelectModes.SelectElement || lookUpId !== JSX_LOOKUP_ROOT)
    ) {
      setHighlightBox(componentElement?.getBoundingClientRect());
    } else {
      setHighlightBox(undefined);
    }
  };
  const onOverlayClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    console.log('onOverlayClick', Date.now() - lastDragResizeHandled)
    // todo find a better way to prevent this misfire then this hack
    if (selectMode === undefined && Date.now() - lastDragResizeHandled < 500) {
      return;
    }
    lastDragResizeHandled = 0;
    const componentElement = getComponentElementFromEvent(event, componentView);
    onSelect?.(componentElement);
  };

  const [tempOffset, setTempOffset] = useState({ x: 0, y: 0, width: 0, height: 0 });
  useEffect(() => setTempOffset({ x: 0, y: 0, width: 0, height: 0 }), [selectedElement]);
  const {
    selectedElementBoundingBox,
    selectedElementParentBoundingBox,
  } = useMemo(() => {
    if (!selectedElement) return {};

    const componentElement = componentView?.getElementByLookupId(
      selectedElement?.lookUpId
    );
    const pbcr = componentElement?.parentElement?.getBoundingClientRect();
    const bcr = componentElement?.getBoundingClientRect();
    if (pbcr && bcr) {
      bcr.x -= pbcr.x;
      bcr.y -= pbcr.y;
    }

    return {
      selectedElementParentBoundingBox: pbcr,
      selectedElementBoundingBox: bcr,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement]);
  const selectEnabled = selectMode !== undefined;
  const [draggingHighlight, setDraggingHighlight] = useState<DraggableData>();
  const renderOverlay = () => (
    <div
      className="absolute inset-0"
      onMouseMove={selectEnabled ? onOverlayMove : undefined}
      onMouseLeave={() => setHighlightBox(undefined)}
      onClick={onOverlayClick}
    >
      {selectEnabled && highlightBox ? (
        <div
          className="absolute border-blue-300 border-solid pointer-events-none"
          style={{
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height,
            borderWidth: selectEnabled && highlightBox ? "4px" : "2px",
          }}
        />
      ) : (
        selectedElementBoundingBox && (
          <div
            className="absolute"
            style={
              selectedElementParentBoundingBox && (selectedElement?.computedStyles.position === 'static')
                ? {
                    top: selectedElementParentBoundingBox.top,
                    left: selectedElementParentBoundingBox.left,
                    width: selectedElementParentBoundingBox.width,
                    height: selectedElementParentBoundingBox.height,
                  }
                : {
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                  }
            }
          >
            <Rnd
              className="border-2 border-blue-300 border-solid"
              size={{
                width: selectedElementBoundingBox.width + tempOffset.width,
                height: selectedElementBoundingBox.height + tempOffset.height,
              }}
              position={{
                x: selectedElementBoundingBox.x + tempOffset.x,
                y: selectedElementBoundingBox.y + tempOffset.y,
              }}
              enableResizing={{
                bottom: true,
                right: true,
                bottomRight: true,

                top: false,
                left: false,
                topLeft: false,
                topRight: false,
                bottomLeft: false,
              }}
              bounds="parent"
              onDragStart={(e, d) => {
                setDraggingHighlight(cloneDeep(d));
              }}
              onDragStop={(e, d) => {
                console.log("onDragStop", draggingHighlight, d);
                setDraggingHighlight(undefined);
                const deltaX = d.x - (draggingHighlight?.x || 0);
                const deltaY = d.y - (draggingHighlight?.y || 0);
                if (deltaX || deltaY) {
                  lastDragResizeHandled = Date.now();
                  onMoveResizeSelection?.(deltaX, deltaY, undefined, undefined);
                  setTempOffset(produce(draft => {
                    draft.x += deltaX;
                    draft.y += deltaY;
                  }));
                }
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                if (!delta.width && !delta.height) return;
                console.log('onResizeStop')

                lastDragResizeHandled = Date.now();
                setTempOffset(produce(draft => {
                  draft.width += delta.width;
                  draft.height += delta.height;
                }));
                if (delta.height) {
                  if (delta.width) {
                    onMoveResizeSelection?.(
                      undefined,
                      undefined,
                      ref.style.width,
                      ref.style.height
                    );
                  } else {
                    onMoveResizeSelection?.(
                      undefined,
                      undefined,
                      undefined,
                      ref.style.height
                    );
                  }
                } else {
                  onMoveResizeSelection?.(
                    undefined,
                    undefined,
                    ref.style.width,
                    undefined
                  );
                }
              }}
            />
          </div>
        )
      )}
    </div>
  );
  return [!!draggingHighlight, renderOverlay] as const;
}

export interface SelectedElement {
  lookUpId: string;
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
  const { enqueueSnackbar } = useSnackbar();
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
      console.log("setCodeWithLookupData", res.ast);
      setCodeWithLookupData({
        transformedCode,
        ...res,
        ast: deepFreeze(cloneDeep(res.ast)),
      });
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

  const updateSelectedElementStyles = (styles: Styles) => {
    if (selectedElement) {
      componentView.current?.addTempStyles(selectedElement.lookUpId, styles);

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

      console.log(
        "updateSelectedElementStyles",
        styles,
        selectedElement,
        codeWithLookupData
      );
      let madeChange = false;
      const newAst = removeLookupData(
        selectedComponentStyledLookupId
          ? editStyledTemplateByLookup(
              codeWithLookupData!.ast,
              selectedComponentStyledLookupId,
              (path) => {
                applyStyledStyleAttribute(path, styles);
                madeChange = true;
              }
            )
          : editJSXElementByLookup(
              codeWithLookupData!.ast,
              selectedElement.lookUpId,
              (path) => {
                applyJSXInlineStyleAttribute(path, styles);
                madeChange = true;
              }
            )
      );
      console.log(
        "updateSelectedElementStyle change",
        madeChange,
        newAst
      );

      if (madeChange) {
        setCode(prettyPrintAST(newAst));
      }
    }
  };

  const updateSelectedElementStyle = (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string
  ) => {
    if (
      selectedElement &&
      newValue !== selectedElement?.computedStyles[styleProp]
    ) {
      updateSelectedElementStyles([
        { styleName: styleProp, styleValue: newValue },
      ]);
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
    updateSelectedElementStyle,
    onSaveCode: () => {
      if (filePath) fs.writeFileSync(filePath, code);
      else alert("please open a file before saving");
    },
  });

  const [draggingHighlight, renderOverlay] = useOverlay(
    componentView.current,
    selectedElement,
    selectMode,
    (componentElement) => {
      switch (selectMode) {
        default:
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
            setCodeImmediately(BOILER_PLATE_CODE);
            setSelectMode(undefined);
            enqueueSnackbar("Started a new component!");
            break;
          }

          const lookUpId = (componentElement as HTMLElement)?.dataset?.[
            JSX_LOOKUP_DATA_ATTR
          ];
          if (!lookUpId || !codeWithLookupData) break;

          let madeChange = false;
          const newAst = removeLookupData(
            editJSXElementByLookup(codeWithLookupData.ast, lookUpId, (path) => {
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
    },
    (deltaX, deltaY, width, height) => {
      if (!deltaX && !deltaY && !width && !height) return;
      const styles: Styles = [];

      if (deltaX) {
        const currentMarginLeft = parseInt(
          selectedElement?.computedStyles.marginLeft.replace("px", "") || "0"
        );
        const newMarginLeft = (currentMarginLeft + deltaX).toFixed(0);
        styles.push({
          styleName: "marginLeft",
          styleValue: `${newMarginLeft}px`,
        });
      }
      if (deltaY) {
        const currentMarginTop = parseInt(
          selectedElement?.computedStyles.marginTop.replace("px", "") || "0"
        );
        const newMarginTop = (currentMarginTop + deltaY).toFixed(0);
        styles.push({
          styleName: "marginTop",
          styleValue: `${newMarginTop}px`,
        });
      }
      if (width) styles.push({ styleName: "width", styleValue: width });
      if (height) styles.push({ styleName: "height", styleValue: height });

      updateSelectedElementStyles(styles);
    }
  );

  const activeHighlight = useRef<string[]>([]);
  const editorRef = useRef<MonacoEditor>(null);
  useEffect(() => {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (selectedElement) {
      console.log("refreshing monaco decorations");
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
            pan={{
              disabled: draggingHighlight,
            }}
            options={{
              minScale: 0.01,
              maxScale: 3,
              limitToBounds: false,
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }: any) => (
              <React.Fragment>
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
                    <button
                      className="btn px-4 rounded-tl-none"
                      onClick={zoomIn}
                    >
                      +
                    </button>
                    <button className="btn px-4" onClick={zoomOut}>
                      -
                    </button>
                    <button
                      className="btn px-4 rounded-r-none"
                      onClick={resetTransform}
                    >
                      x
                    </button>
                  </div>
                </div>
                <TransformComponent>
                  <div className="flex m-12 relative bg-white shadow-2xl">
                    <CompilerComponentView
                      ref={componentView}
                      code={codeWithLookupData?.transformedCode || ""}
                      filePath={filePath}
                      onCompileStart={() => setLoading(true)}
                      onCompileEnd={onComponentViewCompiled}
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
      {selectMode !== undefined && renderSelectBar()}
    </div>
  );
}

export default App;
