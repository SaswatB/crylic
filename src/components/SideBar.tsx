import React, { FunctionComponent, useEffect, useRef } from "react";
import {
  faBars,
  faCaretSquareDown,
  faCheckSquare,
  faCog,
  faDotCircle,
  faEdit,
  faFont,
  faHeading,
  faHSquare,
  faPlus,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
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
import { OutlineElement, Project, SelectedElement } from "../types/paint";
import {
  CSS_ALIGN_ITEMS_OPTIONS,
  CSS_DISPLAY_OPTIONS,
  CSS_FLEX_DIRECTION_OPTIONS,
  CSS_FLEX_WRAP_OPTIONS,
  CSS_JUSTIFY_CONTENT_OPTIONS,
  CSS_POSITION_OPTIONS,
  CSS_TEXT_ALIGN_OPTIONS,
  SelectMode,
  SelectModeType,
} from "../utils/constants";
import { getFriendlyName } from "../utils/utils";

const renderSeparator = (title?: string) => (
  <div className="flex items-center">
    {title && (
      <span className="pb-1 mr-2 text-sm text-gray-500 whitespace-no-wrap">
        {title}
      </span>
    )}
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
  onChange: (v: string, preview?: boolean) => void,
  label: string,
  iv: string
) => readonly [
  string,
  (props?: React.HTMLAttributes<HTMLElement>) => JSX.Element
];

interface Props {
  outline: OutlineElement[];
  project: Project | undefined;
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectMode) => void;
  updateSelectedElementStyle: (
    styleProp: keyof CSSStyleDeclaration,
    newValue: string,
    preview?: boolean
  ) => void;
  onChangeFrameSize: (
    width: string | undefined,
    height: string | undefined
  ) => void;
  onNewComponent: () => void;
  onNewStyleSheet: () => void;
  onOpenProject: (filePath: string) => void;
  onOpenFile: (filePath: string) => void;
  onSaveFile: () => void;
  toggleCodeEntryEdit: (codeId: string) => void;
  toggleCodeEntryRender: (codeId: string) => void;
}

export const SideBar: FunctionComponent<Props> = ({
  outline,
  project,
  selectedElement,
  onChangeSelectMode,
  updateSelectedElementStyle,
  onChangeFrameSize,
  onNewComponent,
  onNewStyleSheet,
  onOpenProject,
  onOpenFile,
  onSaveFile,
  toggleCodeEntryEdit,
  toggleCodeEntryRender,
}) => {
  const [, renderComponentViewWidthInput] = useTextInput(
    (newWidth) => onChangeFrameSize(newWidth, undefined),
    "Width",
    "600"
  );
  const [, renderComponentViewHeightInput] = useTextInput(
    (newHeight) => onChangeFrameSize(undefined, newHeight),
    "Height",
    "300"
  );

  const onAddElement = (
    tag: keyof HTMLElementTagNameMap,
    attributes?: Record<string, unknown>
  ) => onChangeSelectMode({ type: SelectModeType.AddElement, tag, attributes });

  const StylePropNameMap: { [index in keyof CSSStyleDeclaration]?: string } = {
    backgroundColor: "Fill",
    flexDirection: "Direction",
    flexWrap: "Wrap",
    alignItems: "Align",
    justifyContent: "Justify",
    textAlign: "Align",
  };
  const useSelectedElementEditor = (
    styleProp: keyof CSSStyleDeclaration,
    useEditorHook: EditorHook = useBoundTextInput
  ) => {
    const onChange = (newValue: string, preview?: boolean) =>
      updateSelectedElementStyle(styleProp, newValue, preview);
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
  const [, renderSelectedElementAlignItemsInput] = useSelectedElementEditor(
    "alignItems",
    useSelectInput.bind(undefined, CSS_ALIGN_ITEMS_OPTIONS)
  );
  const [, renderSelectedElementJustifyContentInput] = useSelectedElementEditor(
    "justifyContent",
    useSelectInput.bind(undefined, CSS_JUSTIFY_CONTENT_OPTIONS)
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
  const [, renderSelectedElementTextAlignInput] = useSelectedElementEditor(
    "textAlign",
    useSelectInput.bind(undefined, CSS_TEXT_ALIGN_OPTIONS)
  );

  const renderMainTab = () => (
    <>
      {renderSeparator("File Options")}
      <div className="btngrp-v">
        {project ? (
          <>
            <button className="btn w-full" onClick={onNewComponent}>
              New Component
            </button>
            <button className="btn w-full" onClick={onNewStyleSheet}>
              New Style Sheet
            </button>
            <button
              className="btn w-full"
              onClick={() => openFilePicker().then((f) => f && onOpenFile(f))}
            >
              Open
            </button>
            <button className="btn w-full" onClick={onSaveFile}>
              Save
            </button>
          </>
        ) : (
          <>
            <button
              className="btn w-full"
              onClick={() =>
                openFilePicker({ properties: ["openDirectory"] }).then(
                  (f) => f && onOpenProject(f)
                )
              }
            >
              Open Project
            </button>
            {/* <button
              className="btn w-full"
              onClick={() => openFilePicker().then((f) => f && onOpenFile(f))}
            >
              New Project
            </button>
            <button
              className="btn w-full"
              onClick={() => openFilePicker().then((f) => f && onOpenFile(f))}
            >
              Quick Design
            </button> */}
          </>
        )}
      </div>
      {renderSeparator("Frame")}
      <div className="flex flex-row items-center justify-center">
        {renderComponentViewWidthInput()}
        <div className="px-4">x</div>
        {renderComponentViewHeightInput()}
      </div>
      {project && (
        <>
          {renderSeparator("Assets")}
          <div className="grid grid-cols-3 py-2">
            <span>Name</span>
            <span>Edit</span>
            <span>Render</span>
            {project.codeEntries.map((codeEntry) => (
              <React.Fragment key={codeEntry.filePath}>
                <span>{getFriendlyName(project, codeEntry.id)}</span>
                <input
                  type="checkbox"
                  checked={codeEntry.edit}
                  onChange={() => toggleCodeEntryEdit(codeEntry.id)}
                />
                <input
                  type="checkbox"
                  checked={codeEntry.render}
                  onChange={() => toggleCodeEntryRender(codeEntry.id)}
                />
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </>
  );

  const gridClass = "grid grid-cols-2 row-gap-3 col-gap-2 py-2";
  const renderElementAdder = () => (
    <>
      {renderSeparator("Containers")}
      <div className={gridClass}>
        <button
          className="btn w-full"
          onClick={() => onAddElement("div", { style: { display: "flex" } })}
        >
          <FontAwesomeIcon icon={faBars} className="transform rotate-90" /> Row
        </button>
        <button
          className="btn w-full"
          onClick={() =>
            onAddElement("div", {
              style: { display: "flex", flexDirection: "column" },
            })
          }
        >
          <FontAwesomeIcon icon={faBars} /> Column
        </button>
      </div>
      {renderSeparator("Text")}
      <div className={gridClass}>
        <button className="btn w-full" onClick={() => onAddElement("h1")}>
          <FontAwesomeIcon icon={faHeading} /> Heading
        </button>
        <button className="btn w-full" onClick={() => onAddElement("span")}>
          <FontAwesomeIcon icon={faFont} /> Text
        </button>
      </div>
      {renderSeparator("Interactive")}
      <div className={gridClass}>
        <button className="btn w-full" onClick={() => onAddElement("button")}>
          <FontAwesomeIcon icon={faPlusSquare} /> Button
        </button>
        <button className="btn w-full" onClick={() => onAddElement("a")}>
          <FontAwesomeIcon icon={faCaretSquareDown} /> Link
        </button>
      </div>
      {renderSeparator("Form")}
      <div className={gridClass}>
        <button
          className="btn w-full"
          onClick={() => onAddElement("input", { type: "text" })}
        >
          <FontAwesomeIcon icon={faHSquare} /> Textbox
        </button>
        <button className="btn w-full" onClick={() => onAddElement("select")}>
          <FontAwesomeIcon icon={faCaretSquareDown} /> Select
        </button>
        <button
          className="btn w-full"
          onClick={() => onAddElement("input", { type: "checkbox" })}
        >
          <FontAwesomeIcon icon={faCheckSquare} /> Checkbox
        </button>
        <button
          className="btn w-full"
          onClick={() => onAddElement("input", { type: "radio" })}
        >
          <FontAwesomeIcon icon={faDotCircle} /> Radio
        </button>
      </div>
    </>
  );

  const renderSelectedElementEditor = () =>
    selectedElement && (
      <>
        {renderSeparator("Layout")}
        <div className={gridClass}>
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
        <div className={gridClass}>
          {renderSelectedElementOpacityInput()}
          {renderSelectedElementBackgroundColorInput()}
        </div>
        {/* todo border */}
        {renderSeparator("Text")}
        <div className={gridClass}>
          {renderSelectedElementColorInput()}
          {selectedElementDisplay !== "flex" &&
            renderSelectedElementTextAlignInput()}
        </div>
        {selectedElementDisplay === "flex" && (
          <>
            {renderSeparator("Content")}
            <div className="grid grid-cols-2  row-gap-3 col-gap-2 pt-1 pb-2">
              {renderSelectedElementFlexDirectionInput()}
              {renderSelectedElementFlexWrapInput()}
              {renderSelectedElementAlignItemsInput()}
              {renderSelectedElementJustifyContentInput()}
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
        !!project?.codeEntries.filter((codeEntry) => codeEntry.render)
          .length && {
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
