import React, { useEffect, useMemo, useRef, useState } from "react";
import { DraggableData, Rnd } from "react-rnd";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { CircularProgress } from "@material-ui/core";
import { namedTypes as t } from "ast-types";
import deepFreeze from "deep-freeze-strict";
import { produce } from "immer";
import { cloneDeep } from "lodash";
import { useSnackbar } from "notistack";

import {
  CompilerComponentView,
  CompilerComponentViewRef,
  getComponentElementFromEvent,
} from "./components/CompilerComponentView";
import { EditorPane } from "./components/EditorPane";
import { SideBar } from "./components/SideBar";
import { useDebounce } from "./hooks/useDebounce";
import { CodeEntry, OutlineElement, SelectedElement } from "./types/paint";
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
  AddLookupDataResult,
  applyJSXInlineStyleAttribute,
  applyStyledStyleAttribute,
  editJSXElementByLookupId,
  editStyledTemplateByLookup,
  removeLookupData,
  removeRecentlyAddedDataAttrAndGetLookupId,
  Styles,
} from "./utils/ast-parsers";
import {
  BOILER_PLATE_CODE,
  JSX_LOOKUP_DATA_ATTR,
  JSX_LOOKUP_ROOT,
  JSX_RECENTLY_ADDED,
  JSX_RECENTLY_ADDED_DATA_ATTR,
  SelectModes,
  STYLED_LOOKUP_CSS_VAR_PREFIX,
} from "./utils/constants";
import "./App.scss";

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
    const lookupId = (componentElement as HTMLElement)?.dataset[
      JSX_LOOKUP_DATA_ATTR
    ];
    if (
      lookupId &&
      (selectMode !== SelectModes.SelectElement || lookupId !== JSX_LOOKUP_ROOT)
    ) {
      setHighlightBox(componentElement?.getBoundingClientRect());
    } else {
      setHighlightBox(undefined);
    }
  };
  const onOverlayClick = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    console.log("onOverlayClick", Date.now() - lastDragResizeHandled);
    // todo find a better way to prevent this misfire then this hack
    if (selectMode === undefined && Date.now() - lastDragResizeHandled < 500) {
      return;
    }
    lastDragResizeHandled = 0;
    const componentElement = getComponentElementFromEvent(event, componentView);
    onSelect?.(componentElement);
  };

  const [tempOffset, setTempOffset] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  useEffect(() => setTempOffset({ x: 0, y: 0, width: 0, height: 0 }), [
    selectedElement,
  ]);
  const {
    selectedElementBoundingBox,
    selectedElementParentBoundingBox,
  } = useMemo(() => {
    if (!selectedElement) return {};

    const componentElement = componentView?.getElementByLookupId(
      selectedElement?.lookupId
    );
    const pbcr =
      selectedElement?.computedStyles.position === "static"
        ? componentElement?.parentElement?.getBoundingClientRect()
        : undefined;
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
              selectedElementParentBoundingBox
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
                  setTempOffset(
                    produce((draft) => {
                      draft.x += deltaX;
                      draft.y += deltaY;
                    })
                  );
                }
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                if (!delta.width && !delta.height) return;
                console.log("onResizeStop");

                lastDragResizeHandled = Date.now();
                setTempOffset(
                  produce((draft) => {
                    draft.width += delta.width;
                    draft.height += delta.height;
                  })
                );
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

const buildOutline = (element: Element): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      if (JSX_LOOKUP_DATA_ATTR in (child as HTMLElement).dataset) {
        return [
          {
            tag: child.tagName,
            lookupId: (child as HTMLElement).dataset[JSX_LOOKUP_DATA_ATTR]!,
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
  const [codeEntriesLookupData, setCodeEntriesLookupData] = useState<
    Record<string, (AddLookupDataResult & { ast: t.File }) | undefined>
  >({});
  const componentView = useRef<CompilerComponentViewRef>(null);

  const setCode = (codeId: string, code: string) => {
    setCodeEntries(
      produce((draft: CodeEntry[]) => {
        (
          draft.find((entry) => entry.id === codeId) ||
          ({} as Partial<CodeEntry>)
        ).code = code;
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
  const compileTasks = useRef<Function[]>([]);
  const onComponentViewCompiled = () => {
    setLoading(false);
    if (selectedElement) {
      const newSelectedComponent = componentView.current?.getElementByLookupId(
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

    const root = componentView.current?.getElementByLookupId(JSX_LOOKUP_ROOT);
    if (root) setOutline(buildOutline(root));

    compileTasks.current.forEach((task) => task());
    compileTasks.current = [];
  };

  const updateSelectedElementStyles = (styles: Styles, preview?: boolean) => {
    if (selectedElement) {
      componentView.current?.addTempStyles(
        selectedElement.lookupId,
        styles,
        !preview
      );
      // preview is a flag used to quickly show updates in the dom
      // there shouldn't be any expensive calculations done when it's on
      // such as changing state or parsing ast
      if (preview) return;

      const codeId = getCodeIdFromLookupId(selectedElement.lookupId);
      const lookupData = codeEntriesLookupData[codeId];
      const selectedComponent = componentView.current?.getElementByLookupId(
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
      console.log("updateSelectedElementStyle change", madeChange, newAst);

      if (madeChange) {
        setCode(codeId, prettyPrintAST(newAst));
      }
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
          if (!codeEntries.length) {
            setCodeEntries([
              { id: "new", filePath: "/untitled.tsx", code: BOILER_PLATE_CODE },
            ]);
            setSelectMode(undefined);
            enqueueSnackbar("Started a new component!");
            break;
          }

          const lookupId = (componentElement as HTMLElement)?.dataset?.[
            JSX_LOOKUP_DATA_ATTR
          ];
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
              compileTasks.current.push(() => {
                const newChildComponent = componentView.current?.getElementByLookupId(
                  newChildLookupId!
                );
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

  const [codeEntries, setCodeEntries] = useState<CodeEntry[]>([]);
  const renderSideBar = () => (
    <SideBar
      outline={outline}
      selectedElement={selectedElement}
      onChangeSelectMode={setSelectMode}
      updateSelectedElementStyle={updateSelectedElementStyle}
      onOpenFile={(filePath) => {
        setCodeEntries(
          produce((draft: CodeEntry[]) => {
            draft.push({
              id: hashString(filePath),
              filePath,
              code: fs.readFileSync(filePath, { encoding: "utf-8" }),
            });
          })
        );
      }}
      onSaveFile={() => {
        if (codeEntries) {
          codeEntries.forEach(({ filePath, code }) =>
            fs.writeFileSync(filePath, code)
          );
        } else {
          alert("please open a file before saving");
        }
      }}
    />
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
                      codeEntries={codeEntries}
                      primaryCodeId={codeEntries[0]?.id} // todo support switching between components shown
                      codeTransformer={codeTransformer}
                      onCompileStart={() => setLoading(true)}
                      onCompileEnd={onComponentViewCompiled}
                      style={{
                        // width: `${componentViewWidth}px`,
                        // height: `${componentViewHeight}px`,
                        width: `600px`,
                        height: `300px`,
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
        <EditorPane
          codeEntries={codeEntries}
          onCodeChange={(codeId, newCode) => {
            setSelectedElement(undefined); // todo look into keeping the element selected if possible
            setCode(codeId, newCode);
          }}
          selectedElementId={selectedElement?.lookupId}
          onSelectElement={(lookupId) => {
            const newSelectedComponent = componentView.current?.getElementByLookupId(
              lookupId
            );
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
