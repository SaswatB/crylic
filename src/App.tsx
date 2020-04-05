import React, { useState, useEffect, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import {
  BabelComponentView,
  BabelComponentViewRef,
  getComponentElementFromEvent,
} from "./components/BabelComponentView";
import { useFilePicker } from "./hooks/useFilePicker";
import { useDebounce } from "./hooks/useDebounce";
import { DIV_LOOKUP_DATA_ATTR } from "./utils/constants";
import { addDataAttrToJSXElements, removeDataAttrFromJSXElementsAndEditJSXElement, addJSXChildToJSXElement } from "./utils/ast-utils";
import "./App.scss";

const fs = __non_webpack_require__("fs") as typeof import("fs");

function useOverlay(componentView: BabelComponentViewRef | null, onSelect: (componentElement: Element | null | undefined) => void) {
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
    onSelect(componentElement);
  };


  const renderOverlay = () => (
    <div
      className="absolute inset-0"
      onMouseMove={onOverlayMove}
      onMouseLeave={() => setHighlightBox(undefined)}
      onClick={onOverlayClick}
    >
      {highlightBox && (
        <div
          className="absolute bg-blue-600 opacity-25"
          style={{
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height,
          }}
        />
      )}
    </div>
  )
  return renderOverlay;
}

function App() {
  const [filePath, openFilePicker] = useFilePicker();
  const [code, setCode] = useState("");
  const [codeWithData, setCodeWithData] = useState("");
  const componentView = useRef<BabelComponentViewRef>(null);

  const debouncedCode = useDebounce(code, 1000);
  useEffect(() => {
    try {
      setCodeWithData(addDataAttrToJSXElements(debouncedCode));
    } catch (e) {
      console.log(e);
    }
  }, [debouncedCode]);

  useEffect(() => {
    if (filePath) {
      fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
        setCode(data);
      });
    }
  }, [filePath]);

  const [addElement, setAddElement] = useState<string>(); // todo escape key
  const addDiv = () => {
    setAddElement("div");
  };

  const renderOverlay = useOverlay(componentView.current, componentElement => {
    const lookUpId = (componentElement as HTMLElement)?.dataset?.[
      DIV_LOOKUP_DATA_ATTR
    ];

    let madeChange= false;
    const newCode = removeDataAttrFromJSXElementsAndEditJSXElement(codeWithData, lookUpId, path => {
      addJSXChildToJSXElement(path.value, addElement!);
      madeChange = true;
    });

    if (madeChange) {
      setCode(newCode);
    }
    setAddElement(undefined);
  })

  return (
    <div className="flex flex-col items-stretch w-screen h-screen overflow-hidden text-white">
      {addElement && (
        <div className="w-full p-1 bg-blue-600 text-white text-sm text-center">
          Select where you want to add the element
        </div>
      )}
      <div className="flex flex-1 flex-row">
        <div className="flex flex-col w-64 p-4 bg-gray-800">
          <button className="btn w-full" onClick={openFilePicker}>
            Open
          </button>
          <div className="w-full my-5 border-gray-600 border-solid border-b" />
          <button className="btn w-full" onClick={addDiv}>
            Add Block
          </button>
          <div className="flex flex-row mt-4 items-center justify-center">
            <div className="pr-2">Frame Size:</div>
            <input className="w-12 bg-transparent border border-white border-solid text-center"  />
            <div className="px-4">x</div>
            <input className="w-12 bg-transparent border border-white border-solid text-center" />
          </div>
        </div>
        <div className="flex flex-1 bg-gray-600">
          <div className="flex flex-1 m-12 relative bg-white shadow-2xl">
            <BabelComponentView
              ref={componentView}
              code={codeWithData}
              filePath={filePath}
            />
            {addElement && renderOverlay()}
          </div>
        </div>
        <MonacoEditor
          language="javascript"
          theme="vs-dark"
          width="600px"
          value={code}
          onChange={setCode}
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
