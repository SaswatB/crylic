import React, { useState, useEffect, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  BabelComponentView,
  BabelComponentViewRef,
  getComponentElementFromEvent,
} from "./components/BabelComponentView";
import { useFilePicker } from "./hooks/useFilePicker";
import { useDebounce } from "./hooks/useDebounce";
import { useTextInput, useSelectInput } from "./hooks/useInput";
import {
  DIV_LOOKUP_DATA_ATTR,
  DIV_LOOKUP_ROOT,
  DIV_RECENTLY_ADDED_DATA_ATTR,
  DIV_RECENTLY_ADDED,
} from "./utils/constants";
import {
  addLookupDataAttrToJSXElements,
  removeLookupDataAttrFromJSXElementsAndEditJSXElement,
  addJSXChildToJSXElement,
  removeRecentlyAddedDataAttrAndGetLookupId,
  applyStyleAttribute,
} from "./utils/ast-utils";
import "./App.scss";

const fs = __non_webpack_require__("fs") as typeof import("fs");

const renderSeparator = () => (
  <div className="w-full my-5 border-gray-600 border-solid border-b" />
);

function useOverlay(
  componentView: BabelComponentViewRef | null,
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

enum SelectModes {
  SelectElement,
  AddDivElement,
}

function App() {
  const [filePath, openFilePicker] = useFilePicker();
  const [code, setCode] = useState("");
  const [codeWithData, setCodeWithData] = useState("");
  const componentView = useRef<BabelComponentViewRef>(null);

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

  useEffect(() => {
    if (filePath) {
      fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
        setCodeImmediately(data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  const [selectMode, setSelectMode] = useState<SelectModes>(); // todo escape key
  const [selectedElement, setSelectedElement] = useState<{
    lookUpId: string;
    boundingBox: DOMRect;
    computedStyles: CSSStyleDeclaration;
    inlineStyles: CSSStyleDeclaration;
  }>();

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

  const compileTasks = useRef<Function[]>([]);
  const onComponentViewCompiled = () => {
    if (selectedElement) {
      const newSelectedComponent = componentView.current?.getElementByLookupId(
        selectedElement.lookUpId
      );
      if (newSelectedComponent) {
        selectElement(newSelectedComponent as HTMLElement);
      } else {
        setSelectedElement(undefined);
      }
    }
    compileTasks.current.forEach((task) => task());
  };

  const renderOverlay = useOverlay(
    componentView.current,
    selectedElement?.boundingBox,
    selectMode !== undefined,
    (componentElement) => {
      switch (selectMode) {
        case SelectModes.SelectElement:
          if (componentElement) selectElement(componentElement as HTMLElement);
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
            const [
              newCode2,
              newChildLookUpId,
            ] = removeRecentlyAddedDataAttrAndGetLookupId(newCode);

            if (newChildLookUpId) {
              compileTasks.current.push(() => {
                const newChildComponent = componentView.current?.getElementByLookupId(
                  newChildLookUpId!
                );
                if (newChildComponent) {
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

  const [componentViewWidth, renderComponentViewWidthInput] = useTextInput(
    "600"
  );
  const [componentViewHeight, renderComponentViewHeightInput] = useTextInput(
    "300"
  );

  const updateSelectedElementFactory = (
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

  const useBoundTextInput = (initialValue: string) =>
    useTextInput(initialValue, true);
  const useSelectedElementEditor = (
    styleProp: keyof CSSStyleDeclaration,
    useEditorHook: (
      iv: string
    ) => readonly [
      string,
      (props?: React.HTMLAttributes<HTMLElement>) => JSX.Element
    ] = useBoundTextInput
  ) => {
    const [
      selectedElementValue,
      renderSelectedElementValueInput,
    ] = useEditorHook(
      selectedElement?.inlineStyles[styleProp] ||
        selectedElement?.computedStyles[styleProp]
    );
    useEffect(updateSelectedElementFactory(styleProp, selectedElementValue), [
      selectedElementValue,
    ]);
    return [
      selectedElementValue,
      (props?: React.HTMLAttributes<HTMLElement>) =>
        renderSelectedElementValueInput({
          ...props,
          style: { ...props?.style, fontStyle: selectedElement?.inlineStyles[styleProp] ? undefined : "italic" },
        }),
    ] as const;
  };

  const [, renderSelectedElementWidthInput] = useSelectedElementEditor("width");
  const [, renderSelectedElementHeightInput] = useSelectedElementEditor(
    "height"
  );
  const [
    selectedElementPosition,
    renderSelectedElementPosition,
  ] = useSelectedElementEditor(
    "position",
    useSelectInput.bind(undefined, [
      { name: "Static", value: "static" },
      { name: "Relative", value: "relative" },
      { name: "Fixed", value: "fixed" },
      { name: "Absolute", value: "absolute" },
      { name: "Sticky", value: "sticky" },
    ])
  );
  const [, renderSelectedElementTopInput] = useSelectedElementEditor("top");
  const [, renderSelectedElementLeftInput] = useSelectedElementEditor("left");
  const [, renderSelectedElementBottomInput] = useSelectedElementEditor(
    "bottom"
  );
  const [, renderSelectedElementRightInput] = useSelectedElementEditor("right");

  return (
    <div className="flex flex-col items-stretch w-screen h-screen overflow-hidden text-white">
      {selectMode === SelectModes.AddDivElement && (
        <div className="w-full p-1 bg-blue-600 text-white text-sm text-center">
          Select where you want to add the element
        </div>
      )}
      <div className="flex flex-1 flex-row">
        <div
          className="flex flex-col p-4 bg-gray-800"
          style={{ width: "300px" }}
        >
          <button className="btn w-full" onClick={openFilePicker}>
            Open
          </button>
          {renderSeparator()}
          <button
            className="btn w-full"
            onClick={() => setSelectMode(SelectModes.SelectElement)}
          >
            Select Element
          </button>
          <button
            className="btn w-full"
            onClick={() => setSelectedElement(undefined)}
          >
            Clear Selected Element
          </button>
          <button
            className="btn w-full"
            onClick={() => setSelectMode(SelectModes.AddDivElement)}
          >
            Add Block
          </button>
          {renderSeparator()}
          <div className="mb-2">Frame</div>
          <div className="flex flex-row items-center justify-center">
            w:&nbsp;{" "}
            {renderComponentViewWidthInput({ className: "w-12 text-center" })}
            <div className="px-4">x</div>
            h:&nbsp;{" "}
            {renderComponentViewHeightInput({ className: "w-12 text-center" })}
          </div>
          {selectedElement && (
            <>
              {renderSeparator()}
              <div className="mb-2">Selected Element</div>
              <div>
                Width:{" "}
                {renderSelectedElementWidthInput({
                  className: "w-32 text-center",
                })}
              </div>
              <div>
                Height:{" "}
                {renderSelectedElementHeightInput({
                  className: "w-32 text-center",
                })}
              </div>
              <div>
                Position:{" "}
                {renderSelectedElementPosition({
                  className: "w-32 text-center",
                })}
              </div>
              {selectedElementPosition !== "static" && (
                <>
                  <div>
                    Top:{" "}
                    {renderSelectedElementTopInput({
                      className: "w-32 text-center",
                    })}
                  </div>
                  <div>
                    Left:{" "}
                    {renderSelectedElementLeftInput({
                      className: "w-32 text-center",
                    })}
                  </div>
                  <div>
                    Bottom:{" "}
                    {renderSelectedElementBottomInput({
                      className: "w-32 text-center",
                    })}
                  </div>
                  <div>
                    Right:{" "}
                    {renderSelectedElementRightInput({
                      className: "w-32 text-center",
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex flex-1 relative bg-gray-600 items-center justify-center overflow-hidden">
          <TransformWrapper
            defaultScale={1}
            options={{
              minScale: 0.01,
              maxScale: 3,
            }}
          >
            {({ zoomIn, zoomOut, resetTransform }: any) => (
              <React.Fragment>
                <div className="flex absolute top-0 right-0 z-10">
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
                    <BabelComponentView
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
          language="javascript"
          theme="vs-dark"
          width="600px"
          value={code}
          onChange={code => {
            setCode(code);
            setSelectedElement(undefined); // todo look into keeping the element selected if possible
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
