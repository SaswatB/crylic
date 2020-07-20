import React, {
  CSSProperties,
  FunctionComponent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  faCog,
  faCompress,
  faEdit,
  faExpand,
  faEye,
  faFilter,
  faPlus,
  faStream,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Checkbox, FormControlLabel } from "@material-ui/core";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";
import { startCase, uniq } from "lodash";

import { Tabs, TabsRef } from "../components/Tabs";
import { useDebouncedFunction } from "../hooks/useDebouncedFunction";
import { openFilePicker, saveFilePicker } from "../hooks/useFilePicker";
import {
  useAutocomplete,
  useColorPicker,
  useCSSLengthInput,
  useInputFunction,
  useMenuInput,
  useSelectInput,
  useTextInput,
} from "../hooks/useInput";
import { useObservable } from "../hooks/useObservable";
import {
  CodeEntry,
  OutlineElement,
  SelectedElement,
  Styles,
} from "../types/paint";
import {
  EditContext,
  ElementASTEditor,
  StyleGroup,
} from "../utils/ast/editors/ASTEditor";
import {
  CSS_ALIGN_ITEMS_OPTIONS,
  CSS_BACKGROUND_SIZE_OPTIONS,
  CSS_BOX_SIZING_OPTIONS,
  CSS_CURSOR_OPTIONS,
  CSS_DISPLAY_OPTIONS,
  CSS_FLEX_DIRECTION_OPTIONS,
  CSS_FLEX_WRAP_OPTIONS,
  CSS_FONT_FAMILY_OPTIONS,
  CSS_FONT_WEIGHT_OPTIONS,
  CSS_JUSTIFY_CONTENT_OPTIONS,
  CSS_POSITION_OPTIONS,
  CSS_TEXT_ALIGN_OPTIONS,
  CSS_TEXT_DECORATION_LINE_OPTIONS,
  SelectMode,
  SelectModeType,
} from "../utils/constants";
import { linkComponent } from "../utils/defs/react-router-dom";
import { Project } from "../utils/Project";
import {
  getElementUniqueId,
  IMAGE_EXTENSION_REGEX,
  isImageEntry,
  isStyleEntry,
  renderSeparator,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "../utils/utils";
import { Collapsible } from "./Collapsible";
import { IconButton } from "./IconButton";
import { Tour, TourContext } from "./Tour";

const path = __non_webpack_require__("path") as typeof import("path");

type EditorHook<T> = useInputFunction<
  {
    onChange: (v: string, preview?: boolean) => void;
    label: string;
  } & T,
  { className?: string; style?: CSSProperties }
>;

const useBoundTextInput: useInputFunction = (config) =>
  useTextInput({ ...config, bindInitialValue: true });
const useBoundCSSLengthInput: useInputFunction = (config) =>
  useCSSLengthInput({ ...config, bindInitialValue: true });

const useMainTab = ({
  project,
  onNewComponent,
  onNewStyleSheet,
  onImportImage,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onCloseProject,
  onChangeSelectMode,
  toggleCodeEntryEdit,
  addRenderEntry,
}: Props) => {
  const { tourDisabled, setTourDisabled, resetTour } = useContext(TourContext);

  const [
    assetsFilter,
    renderAssetsFilterMenu,
    openAssetsFilterMenu,
    closeAssetsFilterMenu,
  ] = useMenuInput({
    options: [
      { name: "All", value: "all" },
      { name: "Components", value: "components" },
      { name: "Styles", value: "styles" },
      { name: "Images", value: "images" },
    ],
    onChange: () => closeAssetsFilterMenu(),
    initialValue: "components",
  });

  const [, renderAddMenu, openAddMenu, closeAddMenu] = useMenuInput({
    options: [
      { name: "New Component", value: "component" },
      { name: "New Style Sheet", value: "stylesheet" },
      { name: "Import Image", value: "image" },
    ],
    disableSelection: true,
    onChange: (value) => {
      closeAddMenu();
      switch (value) {
        case "component":
          onNewComponent();
          break;
        case "stylesheet":
          onNewStyleSheet();
          break;
        case "image":
          onImportImage();
          break;
      }
    },
  });

  interface Tree {
    id: string;
    name: string;
    children: Tree[];
    codeEntry?: CodeEntry;
  }

  let codeEntries: CodeEntry[] | undefined;
  // todo add an option to keep showing extensions
  let extensionRegex: RegExp | undefined;
  let projectTreePostProcess:
    | ((projectTree: Tree) => void)
    | undefined = undefined;
  switch (assetsFilter) {
    default:
    case "all":
      codeEntries = project?.codeEntries;
      break;
    case "components":
      codeEntries = project?.codeEntries.filter(
        (codeEntry) => codeEntry.isRenderable
      );
      extensionRegex = SCRIPT_EXTENSION_REGEX;
      projectTreePostProcess = (projectTree) => {
        const flattenComponents = (node: Tree) => {
          // flatten tree node entries where the component is the only file in its directory
          // and its name matches the directory or is 'index'
          if (
            node.children.length === 1 &&
            (node.name === node.children[0].name ||
              node.children[0].name === "index") &&
            node.children[0].children.length === 0
          ) {
            node.codeEntry = node.children[0].codeEntry;
            node.children = [];
            return;
          }
          node.children.forEach(flattenComponents);
        };
        flattenComponents(projectTree);
      };
      break;
    case "styles":
      codeEntries = project?.codeEntries.filter(isStyleEntry);
      extensionRegex = STYLE_EXTENSION_REGEX;
      break;
    case "images":
      codeEntries = project?.codeEntries.filter(isImageEntry);
      // todo show extensions if there are duplicate names for different extensions
      extensionRegex = IMAGE_EXTENSION_REGEX;
      break;
  }
  const treeNodeIds = new Set<string>("root");
  const projectTree: Tree = { id: "root", name: "", children: [] };
  const projectPath = project?.sourceFolderPath.replace(/\\/g, "/");
  codeEntries?.forEach((codeEntry) => {
    const path = codeEntry.filePath
      .replace(/\\/g, "/")
      .replace(projectPath || "", "")
      .replace(/^\//, "")
      .replace(extensionRegex || "", "")
      .split("/");

    let node = projectTree;
    let error = false;
    path.forEach((pathPart, index) => {
      if (error) return;

      const id = path.slice(0, index + 1).join("/");
      let child = node.children.find((childNode) => childNode.id === id);
      if (!child) {
        child = {
          id,
          name: pathPart,
          children: [],
        };

        // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
        if (treeNodeIds.has(id)) {
          console.error(
            "duplicate node id",
            id,
            treeNodeIds,
            codeEntries?.map(({ filePath }) => filePath)
          );
          error = true;
          return;
        }

        node.children.push(child);
        treeNodeIds.add(id);
      }
      node = child;
    });
    node.codeEntry = codeEntry;
  });
  projectTreePostProcess?.(projectTree);

  let renderedFirstEditableNode = false;
  let renderedFirstRenderableNode = false;
  const renderTreeLabel = ({ name, codeEntry }: Tree) => {
    if (!codeEntry) return name;

    let isFirstEditableNode = false;
    if (!renderedFirstEditableNode && codeEntry.isEditable) {
      isFirstEditableNode = true;
      renderedFirstEditableNode = true;
    }
    let isFirstRenderableNode = false;
    if (!renderedFirstRenderableNode && codeEntry.isRenderable) {
      isFirstRenderableNode = true;
      renderedFirstRenderableNode = true;
    }

    return (
      <div className="flex">
        {name}
        <div className="flex-1" />
        {codeEntry.isRenderable && (
          <>
            {isFirstRenderableNode && (
              <Tour
                name="asset-tree-render"
                dependencies={["asset-tree"]}
                beaconStyle={{
                  marginTop: 10,
                  marginLeft: 7,
                }}
              >
                Here you get to unleash the power of Crylic! <br />
                <br />
                Using this action, components can be shown on the main view,
                where they can be interacted with and edited. <br />
                <br />
                Try it now!
              </Tour>
            )}
            <IconButton
              data-tour={
                isFirstRenderableNode ? "asset-tree-render" : undefined
              }
              title="View"
              className="mx-3"
              icon={faEye}
              onClick={() => addRenderEntry(codeEntry)}
            />
          </>
        )}
        {codeEntry.isRenderable && (project?.renderEntries.length ?? 0) > 0 && (
          <IconButton
            className="mr-3"
            title="Add to Component"
            icon={faPlus}
            onClick={() =>
              // todo throw an error if exportName isn't set
              onChangeSelectMode({
                type: SelectModeType.AddElement,
                component: {
                  name,
                  import: {
                    name: codeEntry.exportName!,
                    path: codeEntry.filePath,
                    isDefault: codeEntry.exportIsDefault,
                  },
                },
              })
            }
          />
        )}
        {codeEntry.isEditable && (
          <>
            {isFirstEditableNode && (
              <Tour
                name="asset-tree-edit"
                dependencies={["asset-tree"]}
                beaconStyle={{
                  marginTop: 10,
                  marginLeft: -8,
                }}
              >
                Edit any asset in a code editor, changes are reflected
                automatically within the component viewer.
              </Tour>
            )}
            <IconButton
              data-tour={isFirstRenderableNode ? "asset-tree-edit" : undefined}
              title="Edit Code"
              icon={faEdit}
              onClick={() => toggleCodeEntryEdit(codeEntry)}
            />
          </>
        )}
      </div>
    );
  };

  const renderTree = (node = projectTree) => (
    <TreeItem key={node.id} nodeId={node.id} label={renderTreeLabel(node)}>
      {node.children.map(renderTree)}
    </TreeItem>
  );

  const renderMainTab = () => (
    <>
      <Collapsible title="File Options">
        <div className="btngrp-v">
          {project ? (
            <>
              <button className="btn w-full" onClick={onSaveProject}>
                Save All
              </button>
              <button className="btn w-full" onClick={onCloseProject}>
                Close Project
              </button>
            </>
          ) : (
            <>
              <button
                className="btn w-full"
                data-tour="new-project"
                onClick={() =>
                  saveFilePicker({
                    filters: [{ name: "Project", extensions: [""] }],
                  }).then((f) => f && onNewProject(f))
                }
              >
                New Project
              </button>
              <Tour
                name="new-project"
                beaconStyle={{
                  marginTop: -8,
                  marginLeft: 10,
                }}
              >
                Crylic is project based, so to get started you will need to
                either create a new project or open an existing one. <br />
                <br />
                Try creating a new project to start!
                <br />
                Existing React projects can also be opened, ones created with
                create-react-app work the best.
              </Tour>
              <button
                className="btn w-full"
                data-tour="new-project"
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
                data-tour="new-project"
                onClick={() => openFilePicker().then((f) => f && onOpenFile(f))}
              >
                Quick Design
              </button> */}
            </>
          )}
        </div>
      </Collapsible>
      <Collapsible title="Tour Options" defaultCollapsed>
        <FormControlLabel
          className="self-center"
          control={
            <Checkbox
              color="primary"
              checked={!tourDisabled}
              onChange={() => setTourDisabled(!tourDisabled)}
            />
          }
          label="Show Tour"
        />
        {!tourDisabled && (
          <button className="btn w-full" onClick={resetTour}>
            Restart Tour
          </button>
        )}
      </Collapsible>
      {project && (
        <>
          <Tour
            name="asset-tree"
            beaconStyle={{
              marginTop: 20,
              marginLeft: 35,
            }}
          >
            Congrats on starting on your project!
            <br />
            Here you can see all the assets within the project, such as
            components, stylesheets, and images. <br />
          </Tour>
          <div data-tour="asset-tree">
            {renderSeparator(
              "Assets",
              <>
                <Tour name="asset-tree-filter" dependencies={["asset-tree"]}>
                  By default the assets view only shows components, use this
                  filter menu to view more.
                </Tour>
                <IconButton
                  data-tour="asset-tree-filter"
                  className="mx-2"
                  title="Filter Assets"
                  icon={faFilter}
                  onClick={openAssetsFilterMenu}
                />
                <Tour
                  name="asset-tree-add"
                  dependencies={["asset-tree"]}
                  beaconStyle={{
                    marginLeft: -10,
                  }}
                >
                  Use this menu to add new components, stylesheets and images to
                  your project!
                </Tour>
                <IconButton
                  data-tour="asset-tree-add"
                  title="Add Asset"
                  icon={faPlus}
                  onClick={openAddMenu}
                />
              </>
            )}
            {renderAssetsFilterMenu()}
            {renderAddMenu()}
            <TreeView
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
              defaultExpanded={Array.from(treeNodeIds)}
              selected={null as any}
            >
              {projectTree.children.map(renderTree)}
            </TreeView>
          </div>
        </>
      )}
    </>
  );
  return renderMainTab;
};

const useOutlineTab = ({
  project,
  outlineMap,
  selectElement,
  selectedElement,
}: Props) => {
  const outlines = Object.entries(outlineMap)
    .map(([key, value]) => ({
      outline: value!,
      renderEntry: project?.renderEntries.find(({ id }) => id === key)!,
    }))
    .filter(({ outline, renderEntry }) => outline && renderEntry);

  let treeNodeIds = new Set<string>();
  const renderTree = (node: OutlineElement) => {
    const id = `${
      node.element ? getElementUniqueId(node.element) : node.lookupId
    }`;

    // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
    if (treeNodeIds.has(id)) {
      console.error("duplicate node id", id, treeNodeIds, outlines);
      return null;
    }

    treeNodeIds.add(id);
    return (
      <TreeItem
        key={id}
        nodeId={id}
        label={node.tag}
        onClick={() =>
          node.element && selectElement(node.renderId, node.element)
        }
      >
        {node.children.map(renderTree)}
      </TreeItem>
    );
  };

  // render tree ahead of time to populate treeNodeIds
  const renderedTree = outlines.map(({ outline, renderEntry }) =>
    renderTree({
      tag: renderEntry.name,
      renderId: renderEntry.id,
      lookupId: renderEntry.id,
      element: undefined,
      children: outline,
    })
  );

  const renderOutlineTab = () => (
    <div className="mt-4" data-tour="outline-tab">
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        expanded={Array.from(treeNodeIds)}
        selected={
          selectedElement
            ? `${getElementUniqueId(selectedElement.element)}`
            : ""
        }
      >
        {renderedTree}
      </TreeView>
    </div>
  );
  return renderOutlineTab;
};

const TEXT_TAGS = [
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "button",
  "a",
];

const useSelectedElementEditorTab = ({
  project,
  selectedElement,
  updateSelectedElementStyle,
  updateSelectedElementStyles,
  updateSelectedElement,
  updateSelectedElementImage,
}: Props) => {
  const updateSelectedElementAttributes = (
    attributes: Record<string, unknown>
  ) => {
    updateSelectedElement((editor, editContext) =>
      editor.updateElementAttributes(editContext, attributes)
    );
  };

  const [selectedStyleGroup, setSelectedStyleGroup] = useState(
    selectedElement?.styleGroups[0]
  );
  useEffect(() => {
    setSelectedStyleGroup(selectedElement?.styleGroups[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.lookupId]);

  // don't allow text edits on elements with non-text nodes
  // TODO: allow partial edits
  // allow editing elements with text or elements that are supposed to have text
  const allowTextEdit = useMemo(
    () =>
      !Array.from(selectedElement?.element.childNodes || []).find(
        (node) => node.nodeType !== Node.TEXT_NODE
      ) &&
      (TEXT_TAGS.includes(
        selectedElement?.element.tagName.toLowerCase() || ""
      ) ||
        (selectedElement?.element.textContent?.trim().length ?? 0) > 0),
    [selectedElement]
  );

  // debounce text entry
  const updateSelectedElementDebounced = useDebouncedFunction(
    updateSelectedElement,
    1000
  );

  const [, renderTextContentInput] = useBoundTextInput({
    onChange: (newTextContent) => {
      selectedElement!.element.textContent = newTextContent;
      updateSelectedElementDebounced((editor, editContext) =>
        editor.updateElementText(editContext, newTextContent)
      );
    },
    label: "Text Content",
    initialValue: selectedElement?.element.textContent ?? undefined,
  });

  const [, renderIDInput] = useBoundTextInput({
    onChange: (newID) => updateSelectedElementAttributes({ id: newID }),
    label: "Identifier",
    initialValue: selectedElement?.element.id ?? undefined,
  });

  const routeDefinition = useObservable(
    selectedElement?.viewContext?.onRoutesDefined
  );
  const selectedElementIsRouterLink =
    !!routeDefinition &&
    selectedElement?.sourceMetadata?.componentName === "Link";
  const [, renderLinkTargetInput] = useAutocomplete({
    options: (routeDefinition?.routes || []).map((availableRoute) => ({
      name: availableRoute,
      value: availableRoute,
    })),
    freeSolo: true,
    onChange: (newHref) => {
      const shouldBeRouterLink =
        !!routeDefinition &&
        (newHref?.startsWith("/") || newHref?.startsWith("."));
      updateSelectedElement((editor, editContext) => {
        let ast = editContext.ast;
        // rename the link component if it's better used as a router link
        // todo add option to disable this
        if (shouldBeRouterLink !== selectedElementIsRouterLink) {
          ast = editor.updateElementComponent(
            { ...editContext, ast },
            shouldBeRouterLink
              ? { component: linkComponent }
              : {
                  isHTMLElement: true,
                  tag: "a",
                }
          );
        }
        return editor.updateElementAttributes(
          { ...editContext, ast },
          shouldBeRouterLink ? { to: newHref } : { href: newHref }
        );
      });
    },
    label: "Link Target",
    // todo support alias for Link
    initialValue:
      ((selectedElementIsRouterLink &&
        `${selectedElement?.sourceMetadata?.directProps.to || ""}`) ||
        (selectedElement?.element as HTMLLinkElement)?.getAttribute("href")) ??
      undefined,
  });

  const styleGroupOptions = (selectedElement?.styleGroups || []).map(
    (group) => ({
      name: `${group.name}`,
      category: group.category,
      value: group,
    })
  );
  const [, renderStyleGroupSelector] = useAutocomplete({
    // @ts-expect-error todo fix type error caused by generics
    options: styleGroupOptions,
    // @ts-expect-error todo fix type error caused by generics
    onChange: setSelectedStyleGroup,
    // @ts-expect-error todo fix type error caused by generics
    initialValue: selectedStyleGroup,
  });

  const StylePropNameMap: { [index in keyof CSSStyleDeclaration]?: string } = {
    backgroundColor: "Fill",
    backgroundImage: "Image",
    backgroundSize: "Image Size",
    flexDirection: "Direction",
    flexWrap: "Wrap",
    alignItems: "Align",
    justifyContent: "Justify",
    textAlign: "Align",
    fontSize: "Size",
    fontWeight: "Weight",
    fontFamily: "Font",
    textDecorationLine: "Decoration",
  };
  const useSelectedElementEditor = <T extends {} | undefined = undefined>(
    styleProp: keyof CSSStyleDeclaration,
    ...rest: (T extends undefined ? [EditorHook<{}>] : [EditorHook<T>, T]) | []
  ) => {
    const useEditorHook = rest[0] || useBoundCSSLengthInput;
    const editorHookConfig = rest[1] || {};
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

    const [selectedElementValue, renderValueInput] = useEditorHook({
      ...editorHookConfig,
      onChange,
      label,
      initialValue: `${initialValue}`,
    });
    return [
      selectedElementValue,
      (props?: React.HTMLAttributes<HTMLElement>) => renderValueInput(props),
    ] as const;
  };

  const useSelectedElementBreakdownEditor = (prop: "padding" | "margin") => {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const renderExpand = () => (
      <button
        title={`Expand ${startCase(prop)} Options`}
        onClick={() => {
          setShowBreakdown(true);
          // todo only update styles if prop is defined for this style group
          updateSelectedElementStyles(selectedStyleGroup!, [
            {
              styleName: prop,
              styleValue: null,
            },
            {
              styleName: `${prop}Top` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
            {
              styleName: `${prop}Bottom` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
            {
              styleName: `${prop}Left` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
            {
              styleName: `${prop}Right` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faExpand} />
      </button>
    );
    const renderCollapse = () => (
      <button
        title={`Consolidate ${startCase(prop)} Options`}
        onClick={() => {
          setShowBreakdown(false);
          // todo only update styles if prop is defined for this style group
          updateSelectedElementStyles(selectedStyleGroup!, [
            {
              styleName: prop,
              // todo do an average or pick min/max
              styleValue: selectedElement!.computedStyles[
                `${prop}Top` as keyof CSSStyleDeclaration
              ] as string,
            },
            {
              styleName: `${prop}Top` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
            {
              styleName: `${prop}Bottom` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
            {
              styleName: `${prop}Left` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
            {
              styleName: `${prop}Right` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faCompress} />
      </button>
    );
    const [
      selectedElementPropTop,
      renderPropTopInput,
    ] = useSelectedElementEditor(
      `${prop}Top` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );
    const [
      selectedElementPropBottom,
      renderPropBottomInput,
    ] = useSelectedElementEditor(
      `${prop}Bottom` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );
    const [
      selectedElementPropLeft,
      renderPropLeftInput,
    ] = useSelectedElementEditor(
      `${prop}Left` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );
    const [
      selectedElementPropRight,
      renderPropRightInput,
    ] = useSelectedElementEditor(
      `${prop}Right` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );

    // reset breakdown visibility on selected element change
    const refreshBreakdown = (allowUnset = false) => {
      const show =
        uniq([
          selectedElementPropTop,
          selectedElementPropBottom,
          selectedElementPropLeft,
          selectedElementPropRight,
        ]).length > 1;
      if (allowUnset || show) setShowBreakdown(show);
    };
    useEffect(() => {
      refreshBreakdown();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      selectedElementPropBottom,
      selectedElementPropLeft,
      selectedElementPropRight,
      selectedElementPropTop,
    ]);
    useEffect(() => {
      refreshBreakdown(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedElement?.lookupId]);

    const [, renderPropInput] = useSelectedElementEditor(
      prop,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderExpand(),
      }
    );
    return () =>
      showBreakdown ? (
        <>
          {renderPropTopInput()}
          {renderPropBottomInput()}
          {renderPropLeftInput()}
          {renderPropRightInput()}
          {renderBorderRadiusInput()}
        </>
      ) : (
        renderPropInput()
      );
  };

  const [, renderWidthInput] = useSelectedElementEditor("width");
  const [, renderHeightInput] = useSelectedElementEditor("height");
  const [
    selectedElementPosition,
    renderPositionInput,
  ] = useSelectedElementEditor("position", useSelectInput, {
    options: CSS_POSITION_OPTIONS,
  });
  const [, renderTopInput] = useSelectedElementEditor("top");
  const [, renderLeftInput] = useSelectedElementEditor("left");
  const [, renderBottomInput] = useSelectedElementEditor("bottom");
  const [, renderRightInput] = useSelectedElementEditor("right");
  const renderPaddingInput = useSelectedElementBreakdownEditor("padding");
  const renderMarginInput = useSelectedElementBreakdownEditor("margin");
  const [selectedElementDisplay, renderDisplayInput] = useSelectedElementEditor(
    "display",
    useSelectInput,
    {
      options: CSS_DISPLAY_OPTIONS,
    }
  );
  const [, renderBoxSizingInput] = useSelectedElementEditor(
    "boxSizing",
    useSelectInput,
    {
      options: CSS_BOX_SIZING_OPTIONS,
    }
  );
  const [, renderFlexDirectionInput] = useSelectedElementEditor(
    "flexDirection",
    useSelectInput,
    { options: CSS_FLEX_DIRECTION_OPTIONS }
  );
  const [, renderFlexWrapInput] = useSelectedElementEditor(
    "flexWrap",
    useSelectInput,
    { options: CSS_FLEX_WRAP_OPTIONS }
  );
  const [, renderAlignItemsInput] = useSelectedElementEditor(
    "alignItems",
    useSelectInput,
    { options: CSS_ALIGN_ITEMS_OPTIONS }
  );
  const [, renderJustifyContentInput] = useSelectedElementEditor(
    "justifyContent",
    useSelectInput,
    {
      options: CSS_JUSTIFY_CONTENT_OPTIONS,
    }
  );
  const [, renderOpacityInput] = useSelectedElementEditor(
    "opacity",
    useBoundTextInput
  );
  const [, renderBorderRadiusInput] = useSelectedElementEditor("borderRadius");
  const [, renderBackgroundColorInput] = useSelectedElementEditor(
    "backgroundColor",
    useColorPicker
  );

  const useSelectedElementImageEditor = (imageProp: "backgroundImage") => {
    const onChange = (newValue: CodeEntry) =>
      updateSelectedElementImage(selectedStyleGroup!, imageProp, newValue);
    const label =
      StylePropNameMap[imageProp] || startCase(`${imageProp || ""}`);
    const initialValue =
      selectedElement?.inlineStyles[imageProp] ||
      selectedElement?.computedStyles[imageProp] ||
      "";

    const [, renderMenu, openMenu, closeMenu] = useMenuInput({
      options: (project?.codeEntries || [])
        .filter(isImageEntry)
        .map((entry) => ({
          name: path.basename(entry.filePath),
          value: entry.id,
        })),
      disableSelection: true,
      onChange: (newCodeId: string) => {
        closeMenu();
        onChange(project!.getCodeEntry(newCodeId)!);
      },
    });

    const [selectedElementValue, renderValueInput] = useBoundTextInput({
      label,
      initialValue: `${initialValue}`,
    });

    return [
      selectedElementValue,
      (props?: {
        className?: string | undefined;
        style?: React.CSSProperties | undefined;
      }) => (
        <>
          {renderValueInput({ ...props, onClick: openMenu })}
          {renderMenu()}
        </>
      ),
    ] as const;
  };

  const [
    selectedElementBackgroundImage,
    renderBackgroundImageInput,
  ] = useSelectedElementImageEditor("backgroundImage");

  const [, renderBackgroundSizeInput] = useSelectedElementEditor(
    "backgroundSize",
    useAutocomplete,
    {
      options: CSS_BACKGROUND_SIZE_OPTIONS,
      freeSolo: true,
      widePopper: true,
    }
  );

  const [, renderColorInput] = useSelectedElementEditor(
    "color",
    useColorPicker
  );
  const [, renderTextSizeInput] = useSelectedElementEditor("fontSize");
  const [, renderTextWeightInput] = useSelectedElementEditor(
    "fontWeight",
    useSelectInput,
    { options: CSS_FONT_WEIGHT_OPTIONS }
  );
  const [, renderTextFamilyInput] = useSelectedElementEditor(
    "fontFamily",
    useAutocomplete,
    {
      options: CSS_FONT_FAMILY_OPTIONS,
      freeSolo: true,
      widePopper: true,
    }
  );
  const [, renderTextAlignInput] = useSelectedElementEditor(
    "textAlign",
    useSelectInput,
    { options: CSS_TEXT_ALIGN_OPTIONS }
  );
  // todo support multiple selection
  const [, renderTextDecorationLineInput] = useSelectedElementEditor(
    "textDecorationLine",
    useSelectInput,
    {
      options: CSS_TEXT_DECORATION_LINE_OPTIONS,
    }
  );

  const [, renderCursorInput] = useSelectedElementEditor(
    "cursor",
    useSelectInput,
    { options: CSS_CURSOR_OPTIONS }
  );

  const renderEditor = () => (
    <div data-tour="edit-element-tab">
      {renderSeparator("Style Group")}
      {renderStyleGroupSelector()}
      <Collapsible title="Layout">
        <div className="grid2x">
          {renderWidthInput()}
          {renderHeightInput()}
          {renderPositionInput()}
          {renderDisplayInput()}
          {renderBoxSizingInput()}
          {selectedElementPosition !== "static" && (
            <>
              {renderTopInput()}
              {renderLeftInput()}
              {renderBottomInput()}
              {renderRightInput()}
            </>
          )}
          {renderPaddingInput()}
          {renderMarginInput()}
        </div>
      </Collapsible>
      <Collapsible title="Colors">
        <div className="grid2x">
          {renderOpacityInput()}
          {renderBackgroundColorInput()}
          {renderBackgroundImageInput()}
          {selectedElementBackgroundImage !== "none" &&
            renderBackgroundSizeInput()}
        </div>
      </Collapsible>
      {/* todo border */}
      <Collapsible title="Text">
        <div className="grid2x">
          {allowTextEdit &&
            renderTextContentInput({
              className: "col-span-2",
              autoFocus: true,
              multiline: true,
            })}
          {renderColorInput()}
          {renderTextSizeInput()}
          {renderTextWeightInput()}
          {renderTextFamilyInput()}
          {selectedElementDisplay !== "flex" && renderTextAlignInput()}
          {renderTextDecorationLineInput()}
        </div>
      </Collapsible>
      {selectedElementDisplay === "flex" && (
        <>
          <Collapsible title="Content">
            <div className="grid2x">
              {renderFlexDirectionInput()}
              {renderFlexWrapInput()}
              {renderAlignItemsInput()}
              {renderJustifyContentInput()}
            </div>
          </Collapsible>
        </>
      )}
      <Collapsible title="Extras">
        <div className="grid2x">
          {renderCursorInput()}
          {renderIDInput()}
          {/* this check also applies to router links as those render as a */}
          {selectedElement?.element.tagName.toLowerCase() === "a" &&
            renderLinkTargetInput({ className: "col-span-2" })}
        </div>
      </Collapsible>
    </div>
  );
  return renderEditor;
};

interface Props {
  outlineMap: Record<string, OutlineElement[] | undefined>;
  project: Project | undefined;
  selectElement: (renderId: string, componentElement: HTMLElement) => void;
  selectedElement: SelectedElement | undefined;
  onChangeSelectMode: (selectMode: SelectMode) => void;
  updateSelectedElementStyle: (
    styleGroup: StyleGroup,
    styleProp: keyof CSSStyleDeclaration,
    newValue: string,
    preview?: boolean
  ) => void;
  updateSelectedElementStyles: (
    styleGroup: StyleGroup,
    styles: Styles,
    preview?: boolean
  ) => void;
  updateSelectedElement: <T extends {}>(
    apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T
  ) => void;
  updateSelectedElementImage: (
    styleGroup: StyleGroup,
    imageProp: "backgroundImage",
    assetEntry: CodeEntry
  ) => void;
  onNewComponent: () => void;
  onNewStyleSheet: () => void;
  onImportImage: () => void;
  onNewProject: (filePath: string) => void;
  onOpenProject: (filePath: string) => void;
  onSaveProject: () => void;
  onCloseProject: () => void;
  toggleCodeEntryEdit: (codeEntry: CodeEntry) => void;
  addRenderEntry: (codeEntry: CodeEntry) => void;
}

export const SideBar: FunctionComponent<Props> = (props) => {
  const renderMainTab = useMainTab(props);
  const renderOutlineTab = useOutlineTab(props);
  const renderSelectedElementEditor = useSelectedElementEditorTab(props);

  const { selectedElement, project } = props;
  const isRendering = !!project?.renderEntries.length;
  const tabsRef = useRef<TabsRef>(null);
  useEffect(() => {
    if (selectedElement) tabsRef.current?.selectTab("Edit Element");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElement?.lookupId]);
  return (
    <Tabs
      ref={tabsRef}
      tabs={[
        {
          name: <FontAwesomeIcon icon={faCog} />,
          title: "Project",
          render: renderMainTab,
        },
        isRendering && {
          name: (
            <>
              <FontAwesomeIcon icon={faStream} />
              <Tour
                name="outline-tab"
                beaconStyle={{
                  marginTop: -19,
                }}
                onOpen={() => {
                  tabsRef.current?.selectTab("Outline");
                }}
              >
                This is the outline view, here you can see all the elements in
                your component. <br />
                Click on one to edit it!
              </Tour>
            </>
          ),
          title: "Outline",
          render: renderOutlineTab,
        },
        !!selectedElement && {
          name: (
            <>
              <FontAwesomeIcon icon={faEdit} />
              <Tour
                name="edit-element-tab"
                beaconStyle={{
                  marginTop: -19,
                }}
                onOpen={() => {
                  tabsRef.current?.selectTab("Edit Element");
                }}
              >
                This is the element editor, here you can change various
                properties of elements, such as size and text color. Different
                elements can have different properties to edit. <br />
                Try changing the fill!
              </Tour>
            </>
          ),
          title: "Edit Element",
          render: renderSelectedElementEditor,
        },
      ]}
    />
  );
};
