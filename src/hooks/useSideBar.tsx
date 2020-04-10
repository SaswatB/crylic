import React, { useEffect } from "react";
import AppBar from "@material-ui/core/AppBar";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import { SelectModes } from "../utils/constants";
import {
  useTextInput,
  useSelectInput,
  useColorPicker,
} from "../hooks/useInput";
import { useFilePicker } from "../hooks/useFilePicker";
import { SelectedElement, OutlineElement } from "../App";

const renderSeparator = () => (
  <div className="w-full my-5 border-gray-600 border-solid border-b" />
);

interface Props {
  outline: OutlineElement[];
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectModes) => void;
  onClearSelectedElement: () => void;
  updateSelectedElementStyleFactory: (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string
  ) => () => void;
}

export function useSideBar({
  outline,
  selectedElement,
  onChangeSelectMode,
  onClearSelectedElement,
  updateSelectedElementStyleFactory,
}: Props) {
  const [filePath, openFilePicker] = useFilePicker();

  const [componentViewWidth, renderComponentViewWidthInput] = useTextInput(
    "600"
  );
  const [componentViewHeight, renderComponentViewHeightInput] = useTextInput(
    "300"
  );

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
    useEffect(
      updateSelectedElementStyleFactory(styleProp, selectedElementValue),
      [selectedElementValue]
    );
    return [
      selectedElementValue,
      (props?: React.HTMLAttributes<HTMLElement>) =>
        renderSelectedElementValueInput({
          ...props,
          style: {
            ...props?.style,
            fontStyle: selectedElement?.inlineStyles[styleProp]
              ? undefined
              : "italic",
          },
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
  const [
    selectedElementDisplay,
    renderSelectedElementDisplay,
  ] = useSelectedElementEditor(
    "display",
    useSelectInput.bind(undefined, [
      { name: "inline", value: "inline" },
      { name: "block", value: "block" },
      { name: "flex", value: "flex" },
      { name: "none", value: "none" },
      { name: "contents", value: "contents" },
      { name: "grid", value: "grid" },
      { name: "inline-block", value: "inline-block" },
      { name: "inline-flex", value: "inline-flex" },
      { name: "inline-grid", value: "inline-grid" },
      { name: "inline-table", value: "inline-table" },
      { name: "list-item", value: "list-item" },
      { name: "run-in", value: "run-in" },
      { name: "table", value: "table" },
      { name: "table-caption", value: "table-caption" },
      { name: "table-column-group", value: "table-column-group" },
      { name: "table-header-group", value: "table-header-group" },
      { name: "table-footer-group", value: "table-footer-group" },
      { name: "table-row-group", value: "table-row-group" },
      { name: "table-cell", value: "table-cell" },
      { name: "table-column", value: "table-column" },
      { name: "table-row", value: "table-row" },
    ])
  );
  const [, renderSelectedElementFlexDirectionInput] = useSelectedElementEditor(
    "flexDirection",
    useSelectInput.bind(undefined, [
      { name: "row", value: "row" },
      { name: "row-reverse", value: "row-reverse" },
      { name: "column", value: "column" },
      { name: "column-reverse", value: "column-reverse" },
    ])
  );
  const [, renderSelectedElementFlexWrapInput] = useSelectedElementEditor(
    "flexWrap",
    useSelectInput.bind(undefined, [
      { name: "nowrap", value: "nowrap" },
      { name: "wrap", value: "wrap" },
      { name: "wrap-reverse", value: "wrap-reverse" },
    ])
  );
  const [
    ,
    renderSelectedElementBackgroundColorInput,
  ] = useSelectedElementEditor("backgroundColor", useColorPicker);

  const renderMainTab = () => (
    <>
      <button className="btn w-full" onClick={openFilePicker}>
        Open
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
    </>
  );

  const renderElementAdder = () => (
    <>
      <button
        className="btn w-full"
        onClick={() => onChangeSelectMode(SelectModes.AddDivElement)}
      >
        Add Block
      </button>
      {renderSeparator()}
    </>
  );

  const renderSelectedElementEditor = () =>
    selectedElement && (
      <>
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
        <div>
          Display:{" "}
          {renderSelectedElementDisplay({
            className: "w-32 text-center",
          })}
        </div>
        {selectedElementDisplay === "flex" && (
          <>
            <div>
              Flex Direction:{" "}
              {renderSelectedElementFlexDirectionInput({
                className: "w-32 text-center",
              })}
            </div>
            <div>
              Flex Wrap:{" "}
              {renderSelectedElementFlexWrapInput({
                className: "w-32 text-center",
              })}
            </div>
          </>
        )}
        <div>
          Background Color:{" "}
          {renderSelectedElementBackgroundColorInput({
            className: "w-32 text-center",
          })}
        </div>
      </>
    );

  const [tabValue, setTabValue] = React.useState(0);
  useEffect(() => {
    if (selectedElement) setTabValue(2);
    else if (tabValue === 2) setTabValue(1);
  }, [selectedElement?.lookUpId]);
  const render = () => (
    <>
      <AppBar position="static" color="default" className="mb-4">
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="1" />
          <Tab label="2" />
          {selectedElement && <Tab label="3" />}
        </Tabs>
      </AppBar>
      {tabValue === 0 && renderMainTab()}
      {tabValue === 1 && renderElementAdder()}
      {tabValue === 2 && renderSelectedElementEditor()}
    </>
  );

  return {
    render,
    filePath,
    componentViewWidth,
    componentViewHeight,
  };
}
