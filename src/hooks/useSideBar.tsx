import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faPlus,
  faEdit,
  faPalette,
  faFillDrip,
} from "@fortawesome/free-solid-svg-icons";
import { startCase } from "lodash";
import { SelectModes } from "../utils/constants";
import {
  useTextInput,
  useSelectInput,
  useColorPicker,
  useCSSLengthInput,
} from "../hooks/useInput";
import { useFilePicker } from "../hooks/useFilePicker";
import { SelectedElement, OutlineElement } from "../App";
import { Tabs } from "../components/Tabs";

const renderSeparator = () => (
  <div className="w-full my-5 border-gray-600 border-solid border-b" />
);

interface Props {
  outline: OutlineElement[];
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectModes) => void;
  updateSelectedElementStyle: (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string
  ) => void;
  onSaveCode: () => void;
}

export function useSideBar({
  outline,
  selectedElement,
  onChangeSelectMode,
  updateSelectedElementStyle,
  onSaveCode,
}: Props) {
  const [filePath, openFilePicker] = useFilePicker();

  const [componentViewWidth, renderComponentViewWidthInput] = useTextInput(
    undefined,
    "Width",
    "600"
  );
  const [componentViewHeight, renderComponentViewHeightInput] = useTextInput(
    undefined,
    "Height",
    "300"
  );

  const useBoundTextInput = (
    onChange: (v: string) => void,
    label: string,
    initialValue: string
  ) => useTextInput(onChange, label, initialValue, true);
  const useSelectedElementEditor = (
    styleProp: keyof CSSStyleDeclaration,
    label?: string,
    useEditorHook: (
      onChange: (v: string) => void,
      label: string,
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
      (newValue) => {
        updateSelectedElementStyle(styleProp, newValue);
      },
      label || startCase(`${styleProp || ""}`),
      selectedElement?.inlineStyles[styleProp] ||
        selectedElement?.computedStyles[styleProp]
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

  const useBoundCSSLengthInput = (
    onChange: (v: string) => void,
    label: string,
    initialValue: string
  ) => useCSSLengthInput(onChange, label, initialValue, true);
  const [, renderSelectedElementWidthInput] = useSelectedElementEditor(
    "width",
    undefined,
    useBoundCSSLengthInput
  );
  const [, renderSelectedElementHeightInput] = useSelectedElementEditor(
    "height",
    undefined,
    useBoundCSSLengthInput
  );
  const [
    selectedElementPosition,
    renderSelectedElementPosition,
  ] = useSelectedElementEditor(
    "position",
    undefined,
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
    undefined,
    useSelectInput.bind(undefined, [
      { name: "Inline", value: "inline" },
      { name: "Block", value: "block" },
      { name: "Flex", value: "flex" },
      { name: "None", value: "none" },
      { name: "Contents", value: "contents" },
      { name: "Grid", value: "grid" },
      { name: "Inline Block", value: "inline-block" },
      { name: "Inline Flex", value: "inline-flex" },
      { name: "Inline Grid", value: "inline-grid" },
      { name: "Inline Table", value: "inline-table" },
      { name: "List Item", value: "list-item" },
      { name: "Run In", value: "run-in" },
      { name: "Table", value: "table" },
      { name: "Table Caption", value: "table-caption" },
      { name: "Table Column Group", value: "table-column-group" },
      { name: "Table Header Group", value: "table-header-group" },
      { name: "Table Footer Group", value: "table-footer-group" },
      { name: "Table Row Group", value: "table-row-group" },
      { name: "Table Cell", value: "table-cell" },
      { name: "Table Column", value: "table-column" },
      { name: "Table Row", value: "table-row" },
    ])
  );
  const [, renderSelectedElementFlexDirectionInput] = useSelectedElementEditor(
    "flexDirection",
    "Direction",
    useSelectInput.bind(undefined, [
      { name: "Row", value: "row" },
      { name: "Column", value: "column" },
      { name: "Row Reverse", value: "row-reverse" },
      { name: "Column Reverse", value: "column-reverse" },
    ])
  );
  const [, renderSelectedElementFlexWrapInput] = useSelectedElementEditor(
    "flexWrap",
    "Wrap",
    useSelectInput.bind(undefined, [
      { name: "No", value: "No Wrap" },
      { name: "Yes", value: "wrap" },
      { name: "Reverse", value: "wrap-reverse" },
    ])
  );
  const [, renderSelectedElementOpacityInput] = useSelectedElementEditor(
    "opacity"
  );
  const [, renderSelectedElementBorderRadiusInput] = useSelectedElementEditor(
    "borderRadius", undefined, useBoundCSSLengthInput
  );
  const useBackgroundColorPicker = (
    onChange: (v: string) => void,
    label: string,
    initialValue: string
  ) =>
    useColorPicker(
      onChange,
      initialValue,
      label,
      <><FontAwesomeIcon icon={faFillDrip} />&nbsp;Fill</>
    );
  const [
    ,
    renderSelectedElementBackgroundColorInput,
  ] = useSelectedElementEditor(
    "backgroundColor",
    undefined,
    useBackgroundColorPicker
  );

  const useTextColorPicker = (
    onChange: (v: string) => void,
    label: string,
    initialValue: string
  ) =>
    useColorPicker(
      onChange,
      initialValue,
      label,
      <FontAwesomeIcon icon={faPalette} />
    );
  const [, renderSelectedElementColorInput] = useSelectedElementEditor(
    "color",
    undefined,
    useTextColorPicker
  );
  const renderMainTab = () => (
    <>
      <div className="btngrp-v">
        <button className="btn w-full" onClick={openFilePicker}>
          Open
        </button>
        <button className="btn w-full" onClick={onSaveCode}>
          Save
        </button>
      </div>
      {renderSeparator()}
      <div className="mb-4">Frame</div>
      <div className="flex flex-row items-center justify-center">
        {renderComponentViewWidthInput({ className: "w-12 text-center" })}
        <div className="px-4">x</div>
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
        <div>Edit Selected Element</div>
        {renderSeparator()}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {renderSelectedElementWidthInput({
              className: "w-32 text-center",
            })}
          </div>
          <div>
            {renderSelectedElementHeightInput({
              className: "w-32 text-center",
            })}
          </div>
          <div>
            {renderSelectedElementPosition({
              className: "w-32 text-center",
            })}
          </div>
          <div>
            {renderSelectedElementDisplay({
              className: "w-32 text-center",
            })}
          </div>
          {selectedElementPosition !== "static" && (
            <>
              <div>
                {renderSelectedElementTopInput({
                  className: "w-32 text-center",
                })}
              </div>
              <div>
                {renderSelectedElementLeftInput({
                  className: "w-32 text-center",
                })}
              </div>
              <div>
                {renderSelectedElementBottomInput({
                  className: "w-32 text-center",
                })}
              </div>
              <div>
                {renderSelectedElementRightInput({
                  className: "w-32 text-center",
                })}
              </div>
            </>
          )}
          {/* todo padding + margin */}
        </div>
        {renderSeparator()}
        <div className="grid grid-cols-2 gap-4">
          <div>
            {renderSelectedElementOpacityInput({
              className: "w-32 text-center",
            })}
          </div>
          <div>
            {renderSelectedElementBorderRadiusInput({
              className: "w-32 text-center",
            })}
          </div>
          <div>
            {renderSelectedElementBackgroundColorInput({
              className: "w-32 text-center",
            })}
          </div>
        </div>
        {/* todo border */}
        {renderSeparator()}
        <div>
          Text Color:{" "}
          {renderSelectedElementColorInput({
            className: "w-32 text-center",
          })}
        </div>
        {selectedElementDisplay === "flex" && (
          <>
            {renderSeparator()}
            <div className="grid grid-cols-2 gap-4">
              <div>
                {renderSelectedElementFlexDirectionInput({
                  className: "w-32 text-center",
                })}
              </div>
              <div>
                {renderSelectedElementFlexWrapInput({
                  className: "w-32 text-center",
                })}
              </div>
            </div>
            {/* todo align items + justify content */}
          </>
        )}
      </>
    );

  // useEffect(() => {
  //   if (selectedElement) setTabValue(2);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [selectedElement?.lookUpId]);
  const render = () => (
    <Tabs
      tabs={[
        {
          name: <FontAwesomeIcon icon={faCog} />,
          render: renderMainTab,
        },
        {
          name: <FontAwesomeIcon icon={faPlus} />,
          render: renderElementAdder,
        },
        !!selectedElement && {
          name: <FontAwesomeIcon icon={faEdit} />,
          render: renderSelectedElementEditor,
        },
      ]}
    />
  );

  return {
    render,
    filePath,
    componentViewWidth,
    componentViewHeight,
  };
}
