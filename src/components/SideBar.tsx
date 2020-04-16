import React, { FunctionComponent, useEffect, useRef } from "react";
import { faCog, faEdit, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { startCase } from "lodash";

import { Tabs, TabsRef } from "../components/Tabs";
import { openFilePicker } from "../hooks/useFilePicker";
import {
  useColorPicker,
  useCSSLengthInput,
  useSelectInput,
  useTextInput,
} from "../hooks/useInput";
import { OutlineElement, SelectedElement } from "../types/paint";
import {
  CSS_DISPLAY_OPTIONS,
  CSS_FLEX_DIRECTION_OPTIONS,
  CSS_FLEX_WRAP_OPTIONS,
  CSS_POSITION_OPTIONS,
  SelectModes,
} from "../utils/constants";

const renderSeparator = (title?: string) => (
  <div className="flex items-center">
    {title && <span className="pb-1 mr-2 text-sm text-gray-500">{title}</span>}
    <div className="w-full my-5 border-gray-600 border-solid border-b" />
  </div>
);

const useBoundTextInput = (
  onChange: (v: string) => void,
  label: string,
  initialValue: string
) => useTextInput(onChange, label, initialValue, true);
const useBoundCSSLengthInput = (
  onChange: (v: string) => void,
  label: string,
  initialValue: string
) => useCSSLengthInput(onChange, label, initialValue, true);

type EditorHook = (
  onChange: (v: string) => void,
  label: string,
  iv: string
) => readonly [
  string,
  (props?: React.HTMLAttributes<HTMLElement>) => JSX.Element
];

interface Props {
  outline: OutlineElement[];
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectModes) => void;
  updateSelectedElementStyle: (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string
  ) => void;
  onOpenFile: (filePath: string) => void;
  onSaveFile: () => void;
}

export const SideBar: FunctionComponent<Props> = ({
  outline,
  selectedElement,
  onChangeSelectMode,
  updateSelectedElementStyle,
  onOpenFile,
  onSaveFile,
}) => {
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

  const StylePropNameMap: { [index in keyof CSSStyleDeclaration]?: string } = {
    flexDirection: "Direction",
    flexWrap: "Wrap",
    backgroundColor: "Fill",
  };
  const useSelectedElementEditor = (
    styleProp: keyof CSSStyleDeclaration,
    useEditorHook: EditorHook = useBoundTextInput
  ) => {
    const onChange = (newValue: string) =>
      updateSelectedElementStyle(styleProp, newValue);
    const label =
      StylePropNameMap[styleProp] || startCase(`${styleProp || ""}`);
    const initialValue =
      selectedElement?.inlineStyles[styleProp] ||
      selectedElement?.computedStyles[styleProp];

    const [
      selectedElementValue,
      renderSelectedElementValueInput,
    ] = useEditorHook(onChange, label, initialValue);
    return [
      selectedElementValue,
      (props?: React.HTMLAttributes<HTMLElement>) =>
        renderSelectedElementValueInput(props),
    ] as const;
  };

  const [, renderSelectedElementWidthInput] = useSelectedElementEditor(
    "width",
    useBoundCSSLengthInput
  );
  const [, renderSelectedElementHeightInput] = useSelectedElementEditor(
    "height",
    useBoundCSSLengthInput
  );
  const [
    selectedElementPosition,
    renderSelectedElementPosition,
  ] = useSelectedElementEditor(
    "position",
    useSelectInput.bind(undefined, CSS_POSITION_OPTIONS)
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
    useSelectInput.bind(undefined, CSS_DISPLAY_OPTIONS)
  );
  const [, renderSelectedElementFlexDirectionInput] = useSelectedElementEditor(
    "flexDirection",
    useSelectInput.bind(undefined, CSS_FLEX_DIRECTION_OPTIONS)
  );
  const [, renderSelectedElementFlexWrapInput] = useSelectedElementEditor(
    "flexWrap",
    useSelectInput.bind(undefined, CSS_FLEX_WRAP_OPTIONS)
  );
  const [, renderSelectedElementOpacityInput] = useSelectedElementEditor(
    "opacity"
  );
  const [, renderSelectedElementBorderRadiusInput] = useSelectedElementEditor(
    "borderRadius",
    useBoundCSSLengthInput
  );
  const [
    ,
    renderSelectedElementBackgroundColorInput,
  ] = useSelectedElementEditor("backgroundColor", useColorPicker);

  const [, renderSelectedElementColorInput] = useSelectedElementEditor(
    "color",
    useColorPicker
  );

  const renderMainTab = () => (
    <>
      {renderSeparator("File Options")}
      <div className="btngrp-v">
        <button
          className="btn w-full"
          onClick={() => openFilePicker().then((f) => f && onOpenFile(f))}
        >
          Open
        </button>
        <button className="btn w-full" onClick={onSaveFile}>
          Save
        </button>
      </div>
      {renderSeparator("Frame")}
      <div className="flex flex-row items-center justify-center">
        {renderComponentViewWidthInput()}
        <div className="px-4">x</div>
        {renderComponentViewHeightInput()}
      </div>
    </>
  );

  const renderElementAdder = () => (
    <>
      {renderSeparator("Containers")}
      <button
        className="btn w-full"
        onClick={() => onChangeSelectMode(SelectModes.AddDivElement)}
      >
        Block
      </button>
    </>
  );

  const renderSelectedElementEditor = () =>
    selectedElement && (
      <>
        {renderSeparator("Layout")}
        <div className="grid grid-cols-2 row-gap-3 col-gap-2 py-2">
          {renderSelectedElementWidthInput()}
          {renderSelectedElementHeightInput()}
          {renderSelectedElementPosition()}
          {renderSelectedElementDisplay()}
          {selectedElementPosition !== "static" && (
            <>
              {renderSelectedElementTopInput()}
              {renderSelectedElementLeftInput()}
              {renderSelectedElementBottomInput()}
              {renderSelectedElementRightInput()}
            </>
          )}
          {renderSelectedElementBorderRadiusInput()}
          {/* todo padding + margin */}
        </div>
        {renderSeparator("Colors")}
        <div className="grid grid-cols-2 row-gap-3 col-gap-2 py-2">
          {renderSelectedElementOpacityInput()}
          {renderSelectedElementBackgroundColorInput()}
        </div>
        {/* todo border */}
        {renderSeparator("Text")}
        {renderSelectedElementColorInput()}
        {selectedElementDisplay === "flex" && (
          <>
            {renderSeparator("Content")}
            <div className="grid grid-cols-2  row-gap-3 col-gap-2 pt-1 pb-2">
              {renderSelectedElementFlexDirectionInput()}
              {renderSelectedElementFlexWrapInput()}
            </div>
            {/* todo align items + justify content */}
          </>
        )}
      </>
    );

  const tabsRef = useRef<TabsRef>(null);
  useEffect(() => {
    if (selectedElement) tabsRef.current?.selectTab(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.lookupId]);
  return (
    <Tabs
      ref={tabsRef}
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
};
