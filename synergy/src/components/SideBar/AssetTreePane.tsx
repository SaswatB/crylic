import React, { FunctionComponent, useMemo } from "react";
import {
  faEdit,
  faEye,
  faFilter,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";
import { camelCase, upperFirst } from "lodash";
import { useSnackbar } from "notistack";

import { getBoilerPlateComponent, SelectModeType } from "../../constants";
import { useProjectRecoil } from "../../hooks/recoil/useProjectRecoil/useProjectRecoil";
import { useSelectRecoil } from "../../hooks/recoil/useSelectRecoil";
import { useMenuInput } from "../../hooks/useInput";
import { renderSeparator } from "../../lib/render-utils";
import {
  IMAGE_EXTENSION_REGEX,
  isImageEntry,
  isStyleEntry,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "../../lib/utils";
import { CodeEntry } from "../../types/paint";
import { IconButton } from "../IconButton";
import { InputModal } from "../InputModal";
import { Tour } from "../Tour/Tour";

interface Tree {
  id: string;
  name: string;
  children: Tree[];
  codeEntry?: CodeEntry;
}

interface Props {
  onImportImageFile: () => Promise<string | null>;
}

export const AssetTreePane: FunctionComponent<Props> = ({
  onImportImageFile,
}) => {
  const {
    project,
    setProject,
    addCodeEntry,
    toggleCodeEntryEdit,
    addRenderEntry,
  } = useProjectRecoil();
  const { setSelectMode } = useSelectRecoil();
  const { enqueueSnackbar } = useSnackbar();

  const onNewComponent = async () => {
    const inputName = await InputModal({
      title: "New Component",
      message: "Please enter a component name",
    });
    if (!inputName) return;
    // todo add validation/duplicate checking to name
    const name = upperFirst(camelCase(inputName));
    const filePath = project!.getNewComponentPath(name);
    const code = getBoilerPlateComponent(name);
    addCodeEntry({ filePath, code }, { render: true });
    enqueueSnackbar("Started a new component!");
  };
  const onNewStyleSheet = async () => {
    const inputName = await InputModal({
      title: "New StyleSheet",
      message: "Please enter a stylesheet name",
    });
    if (!inputName) return;
    // todo add validation/duplicate checking to name
    const name = camelCase(inputName);
    const filePath = project!.getNewStyleSheetPath(name);
    addCodeEntry({ filePath }, { edit: true });
    enqueueSnackbar("Started a new component!");
  };
  const onImportImage = async () => {
    const file = await onImportImageFile();
    if (!file) return;
    setProject((currentProject) => currentProject?.addAsset(file));
    enqueueSnackbar("Imported Image!");
  };

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

  const { projectTree, treeNodeIds } = useMemo(() => {
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

    return { projectTree, treeNodeIds };
  }, [assetsFilter, project]);

  /**
   * Handle adding a custom component to a frame
   */
  const onAddToComponent = (name: string, codeEntry: CodeEntry) =>
    setSelectMode({
      type: SelectModeType.AddElement,
      component: {
        name,
        import: {
          // todo throw an error if exportName isn't set
          name: codeEntry.exportName!,
          path: codeEntry.filePath,
          isDefault: codeEntry.exportIsDefault,
        },
      },
    });

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
            onClick={() => onAddToComponent(name, codeEntry)}
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

  return (
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
        Here you can see all the assets within the project, such as components,
        stylesheets, and images. <br />
      </Tour>
      <div data-tour="asset-tree" className="flex flex-col h-full">
        {renderSeparator(
          "Assets",
          <>
            <Tour name="asset-tree-filter" dependencies={["asset-tree"]}>
              By default the assets view only shows components, use this filter
              menu to view more.
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
        <div className="flex-1 overflow-auto">
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            defaultExpanded={Array.from(treeNodeIds)}
            selected={null as any}
          >
            {projectTree.children.map(renderTree)}
          </TreeView>
        </div>
      </div>
    </>
  );
};
