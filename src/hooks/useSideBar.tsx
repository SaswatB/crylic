import React, { useEffect } from "react";
import SwipeableViews from 'react-swipeable-views';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { SelectModes } from "../utils/constants";
import { useTextInput, useSelectInput, useColorPicker } from "../hooks/useInput";
import { useFilePicker } from "../hooks/useFilePicker";
import { SelectedElement } from "../App";

const renderSeparator = () => (
  <div className="w-full my-5 border-gray-600 border-solid border-b" />
);

interface Props {
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectModes) => void;
  onClearSelectedElement: () => void;
  updateSelectedElementStyleFactory: (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string
  ) => () => void;
}

export function useSideBar({
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
    useEffect(updateSelectedElementStyleFactory(styleProp, selectedElementValue), [
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
  const [, renderSelectedElementDisplay] = useSelectedElementEditor(
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
  const [, renderSelectedElementBackgroundColorInput] = useSelectedElementEditor("backgroundColor", useColorPicker);

  const renderMainTab = () => (
    <>
      <button className="btn w-full mt-4" onClick={openFilePicker}>
        Open
      </button>
      {renderSeparator()}
      <button
        className="btn w-full"
        onClick={() => onChangeSelectMode(SelectModes.SelectElement)}
      >
        Select Element
      </button>
      <button className="btn w-full" onClick={onClearSelectedElement}>
        Clear Selected Element
      </button>
      <button
        className="btn w-full"
        onClick={() => onChangeSelectMode(SelectModes.AddDivElement)}
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
    </>
  );

  const renderSelectedElementEditor = () => selectedElement && (
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
      <div>
        Display:{" "}
        {renderSelectedElementDisplay({
          className: "w-32 text-center",
        })}
      </div>
      <div>
        Background Color:{" "}
        {renderSelectedElementBackgroundColorInput({
          className: "w-32 text-center",
        })}
      </div>
    </>
  );

  const [tabValue, setTabValue] = React.useState(0);
  const render = () => (
    <>
      <AppBar position="static" color="default">
        <Tabs
          value={tabValue}
          onChange={(e,newValue) => setTabValue(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="1" />
          <Tab label="2" />
          <Tab label="3" />
        </Tabs>
      </AppBar>
      <SwipeableViews
        index={tabValue}
        onChangeIndex={(newValue) => setTabValue(newValue)}
      >
        { tabValue === 0 && (
          renderMainTab()
        )}
        { tabValue === 1 && (
          renderSelectedElementEditor()
        )}
        { tabValue === 2 && (
          <div>
            Item Three
          </div>
        )}
      </SwipeableViews>
    </>
  );

  return {
    render,
    filePath,
    componentViewWidth,
    componentViewHeight,
  };
}
