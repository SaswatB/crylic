import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { faExpandAlt, faSync } from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";

import { useObservable } from "../../hooks/useObservable";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { useService } from "../../hooks/useService";
import { useUpdatingRef } from "../../hooks/useUpdatingRef";
import { buildOutline, findEntryRecurse } from "../../lib/outline";
import {
  RenderEntry,
  RenderEntryCompileStatus,
} from "../../lib/project/RenderEntry";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { OutlineElement, OutlineElementType } from "../../types/paint";
import { SelectedElement } from "../../types/selected-element";
import { IconButton } from "../IconButton";

interface RenderTreeContext {
  onRefresh: () => void;
  onLabelClick: (node: OutlineElement) => void;
  onExpandAllNodes: () => void;
}

const renderTree = (context: RenderTreeContext, node: OutlineElement) => {
  const treeLabel = (
    <div className="flex">
      {node.tag}
      <div className="flex-1" />
      {node.type === OutlineElementType.Frame && (
        <>
          <IconButton
            title="Expand Outline"
            className="mr-2"
            icon={faExpandAlt}
            onClick={context.onExpandAllNodes}
          />
          {/* todo: use a better icon as this icon implies the frame will be refreshed */}
          <IconButton
            title="Refresh Outline"
            icon={faSync}
            onClick={context.onRefresh}
          />
        </>
      )}
    </div>
  );

  return (
    <TreeItem
      key={node.id}
      nodeId={node.id}
      label={treeLabel}
      onLabelClick={(e) => {
        e.preventDefault();
        context.onLabelClick(node);
      }}
    >
      {node.children.map((c) => renderTree(context, c))}
    </TreeItem>
  );
};

function useExpandedNodes({
  renderEntry,
  outline,
  treeNodeIdMap,
  selectedElement,
  collapsedNodes,
  setCollapsedNodes,
}: {
  renderEntry: RenderEntry;
  outline: OutlineElement | undefined;
  treeNodeIdMap: Map<string, OutlineElement>;
  selectedElement: SelectedElement | undefined;
  collapsedNodes: string[];
  setCollapsedNodes: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  // resolve the selected element to a node in the outline
  const selectedElementNodeId = useMemo(() => {
    if (!outline || selectedElement?.renderEntry !== renderEntry)
      return undefined;

    const { element: node, path } =
      findEntryRecurse(
        outline.children,
        (n) => n.element === selectedElement.element
      ) || {};
    if (!node) return;

    const selectedNodeEntry = Array.from(treeNodeIdMap.entries()).find(
      ([, n]) => n === node
    );
    if (!selectedNodeEntry) return;

    // expand the selected node's parent nodes
    setCollapsedNodes((c) =>
      c.filter((i) => !path?.includes(treeNodeIdMap.get(i)!))
    );

    return selectedNodeEntry[0];
  }, [outline, renderEntry, selectedElement, setCollapsedNodes, treeNodeIdMap]);

  // for nodes not seen before, set them to collapsed if they don't have direct children for the current render entry
  const seenNodesRef = useRef<string[]>([]);
  const nodesToCollapseRef = useUpdatingRef<string[]>([]); // updating ref will clear this every render
  useMemo(() => {
    Array.from(treeNodeIdMap.entries()).forEach(([id, node]) => {
      if (
        node.type === OutlineElementType.Frame ||
        seenNodesRef.current.includes(id)
      ) {
        return;
      }
      seenNodesRef.current.push(id);

      const hasElementsForPrimaryCodeEntry = !!findEntryRecurse(
        node.children,
        (c) => c.codeId === renderEntry.codeId
      );
      if (!hasElementsForPrimaryCodeEntry) nodesToCollapseRef.current.push(id);
    });
    if (nodesToCollapseRef.current.length > 0)
      setCollapsedNodes((c) => [...c, ...nodesToCollapseRef.current]);
  }, [
    nodesToCollapseRef,
    renderEntry.codeId,
    setCollapsedNodes,
    treeNodeIdMap,
  ]);

  // preemptively apply the collapsed nodes to avoid the collapse animation
  if (nodesToCollapseRef.current.length > 0) {
    collapsedNodes = [...collapsedNodes, ...nodesToCollapseRef.current];
  }

  const expandedNodes = useMemo(
    () =>
      Array.from(treeNodeIdMap.keys()).filter(
        (i) => !collapsedNodes.includes(i)
      ),
    [collapsedNodes, treeNodeIdMap]
  );
  return { expandedNodes, selectedElementNodeId };
}

interface Props {
  renderEntry: RenderEntry;
}

export function OutlinePaneEntry({ renderEntry }: Props) {
  const project = useProject();
  const selectService = useService(SelectService);
  const [outline, setOutline] = useState<OutlineElement>();
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);

  const selectedElement = useObservable(selectService.selectedElement$);
  const viewContext = useObservable(renderEntry.viewContext$);
  const reactMetadata = useObservable(renderEntry.reactMetadata$);

  const calculateOutline = useCallback(async () => {
    // todo debounce
    const rootElement = viewContext?.getRootElement();
    if (!rootElement) return;
    console.log("reloading outline");

    setOutline(
      (await buildOutline(
        project,
        renderEntry,
        rootElement,
        reactMetadata?.fiberComponentRoot
      )) || []
    );
  }, [project, reactMetadata, renderEntry, viewContext]);

  useEffect(() => void calculateOutline(), [
    renderEntry,
    reactMetadata,
    calculateOutline,
  ]);

  // recalculate the component view outline when the component view compiles, reloads, or changes its route
  useObservableCallback(renderEntry.viewReloaded$, calculateOutline);
  useObservableCallback(renderEntry.domChanged$, calculateOutline);
  useObservableCallback(
    renderEntry.compileStatus$,
    (c) => c === RenderEntryCompileStatus.COMPILED && calculateOutline()
  );

  const treeNodeIdMap = useMemo(() => {
    const map = new Map<string, OutlineElement>();
    function recurse(node: OutlineElement) {
      // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
      while (map.has(node.id)) {
        console.error("duplicate node id", node.id, map, outline);
        node.id = node.id + "+";
      }
      map.set(node.id, node);

      node.children.forEach((c) => recurse(c));
    }
    if (outline) recurse(outline);

    return map;
  }, [outline]);

  const renderedTree = useMemo(() => {
    if (!outline) return null;
    return renderTree(
      {
        onRefresh() {
          void calculateOutline();
        },
        onLabelClick(node) {
          if (node.element) {
            void selectService.selectElement(renderEntry, {
              htmlElement: node.element,
            });
          }
        },
        onExpandAllNodes() {
          setCollapsedNodes([]);
        },
      },
      outline
    );
  }, [calculateOutline, outline, renderEntry, selectService]);

  const { expandedNodes, selectedElementNodeId } = useExpandedNodes({
    renderEntry,
    outline,
    treeNodeIdMap,
    selectedElement,
    collapsedNodes,
    setCollapsedNodes,
  });

  return (
    <TreeView
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      expanded={expandedNodes}
      selected={selectedElementNodeId || ""}
      onNodeToggle={(e, newExpandedNodes) =>
        // only store nodes that have been collapsed
        setCollapsedNodes(
          Array.from(treeNodeIdMap.keys()).filter(
            (n) => !newExpandedNodes.includes(n)
          )
        )
      }
    >
      {renderedTree}
    </TreeView>
  );
}
