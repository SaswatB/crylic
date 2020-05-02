import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import {
  faBars,
  faCaretSquareDown,
  faCheckSquare,
  faCog,
  faDotCircle,
  faEdit,
  faEye,
  faFont,
  faHeading,
  faHSquare,
  faPlus,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";
import { startCase } from "lodash";

import { Tabs, TabsRef } from "../components/Tabs";
import { openFilePicker } from "../hooks/useFilePicker";
import {
  useAutocomplete,
  useColorPicker,
  useCSSLengthInput,
  useSelectInput,
  useTextInput,
} from "../hooks/useInput";
import { CodeEntry, OutlineElement, SelectedElement } from "../types/paint";
import { StyleGroup } from "../utils/ast/editors/ASTEditor";
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
import { Project } from "../utils/Project";
import { isScriptEntry } from "../utils/utils";

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

const gridClass = "grid grid-cols-2 row-gap-3 col-gap-2 py-2";

const useMainTab = ({
  project,
  onNewComponent,
  onNewStyleSheet,
  onOpenFile,
  onSaveFile,
  onOpenProject,
  onChangeFrameSize,
  toggleCodeEntryEdit,
  toggleCodeEntryRender,
}: Props) => {
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

  interface Tree {
    id: string;
    name: string;
    children: Tree[];
    codeEntry?: CodeEntry;
  }
  const projectTree: Tree = { id: "root", name: "", children: [] };
  const projectPath = project?.path.replace(/\\/g, "/");
  project?.codeEntries.forEach((codeEntry) => {
    const path = codeEntry.filePath
      .replace(/\\/g, "/")
      .replace(projectPath!, "")
      .replace(/^\//, "")
      .split("/");
    let node = projectTree;
    path.forEach((pathPart, index) => {
      let child = node.children.find(
        (childNode) => childNode.name === pathPart
      );
      if (!child) {
        child = {
          id: path.slice(0, index + 1).join("/"),
          name: pathPart,
          children: [],
        };
        node.children.push(child);
      }
      node = child;
    });
    node.codeEntry = codeEntry;
  });

  const renderTreeLabel = ({ name, codeEntry }: Tree) =>
    !codeEntry ? (
      name
    ) : (
      <div className="flex">
        {name}
        <div className="flex-1" />
        {isScriptEntry(codeEntry) && (
          <button
            className="mx-3"
            onClick={() => toggleCodeEntryRender(codeEntry.id)}
          >
            <FontAwesomeIcon icon={faEye} />
          </button>
        )}
        <button>
          <FontAwesomeIcon
            icon={faEdit}
            onClick={() => toggleCodeEntryEdit(codeEntry.id)}
          />
        </button>
      </div>
    );

  const renderTree = (node = projectTree) => (
    <TreeItem key={node.id} nodeId={node.id} label={renderTreeLabel(node)}>
      {node.children.map(renderTree)}
    </TreeItem>
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
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            defaultExpanded={projectTree.children.map((child) => child.id)}
          >
            {projectTree.children.map(renderTree)}
          </TreeView>
        </>
      )}
    </>
  );
  return renderMainTab;
};

const useAdderTab = ({ onChangeSelectMode }: Props) => {
  const onAddElement = (
    tag: keyof HTMLElementTagNameMap,
    attributes?: Record<string, unknown>
  ) => onChangeSelectMode({ type: SelectModeType.AddElement, tag, attributes });

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
  return renderElementAdder;
};

const useSelectedElementEditorTab = ({
  selectedElement,
  updateSelectedElementStyle,
}: Props) => {
  const [selectedStyleGroup, setSelectedStyleGroup] = useState(
    selectedElement?.styleGroups[0]
  );
  useEffect(() => {
    setSelectedStyleGroup(selectedElement?.styleGroups[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.lookupId]);

  const styleGroupOptions = (selectedElement?.styleGroups || []).map(
    (group) => ({
      name: `${group.name}`,
      value: group,
    })
  );
  const renderedStyleGroupSelector = useAutocomplete(
    styleGroupOptions,
    setSelectedStyleGroup,
    undefined,
    selectedStyleGroup
  );

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
      updateSelectedElementStyle(
        selectedStyleGroup!,
        styleProp,
        newValue,
        preview
      );
    const label =
      StylePropNameMap[styleProp] || startCase(`${styleProp || ""}`);
    const initialValue =
      selectedElement?.inlineStyles[styleProp] ||
      selectedElement?.computedStyles[styleProp] ||
      "";

    const [
      selectedElementValue,
      renderSelectedElementValueInput,
    ] = useEditorHook(onChange, label, `${initialValue}`);
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

  const renderSelectedElementEditor = () => (
    <>
      {renderSeparator("Style Group")}
      {renderedStyleGroupSelector}
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
        </>
      )}
    </>
  );
  return renderSelectedElementEditor;
};

interface Props {
  outline: OutlineElement[];
  project: Project | undefined;
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectMode) => void;
  updateSelectedElementStyle: (
    styleGroup: StyleGroup,
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

export const SideBar: FunctionComponent<Props> = (props) => {
  const renderMainTab = useMainTab(props);
  const renderElementAdder = useAdderTab(props);
  const renderSelectedElementEditor = useSelectedElementEditorTab(props);

  const { selectedElement, project } = props;
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
