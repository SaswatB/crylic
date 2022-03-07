import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSnackbar } from "notistack";

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
import { OutlineTree } from "./OutlineTree";

function useOutline(renderEntry: RenderEntry) {
  const project = useProject();
  const [outline, setOutline] = useState<OutlineElement>();

  const viewContext = useObservable(renderEntry.viewContext$);
  const reactMetadata = useObservable(renderEntry.reactMetadata$);
  const refreshOutline = useCallback(async () => {
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

  useEffect(() => void refreshOutline(), [
    renderEntry,
    reactMetadata,
    refreshOutline,
  ]);

  // recalculate the component view outline when the component view compiles, reloads, or changes its route
  useObservableCallback(renderEntry.viewReloaded$, refreshOutline);
  useObservableCallback(renderEntry.domChanged$, refreshOutline);
  useObservableCallback(
    renderEntry.compileStatus$,
    (c) => c === RenderEntryCompileStatus.COMPILED && refreshOutline()
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

  return { outline, treeNodeIdMap, refreshOutline };
}

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
  const { enqueueSnackbar } = useSnackbar();
  const selectService = useService(SelectService);
  const selectedElement = useObservable(selectService.selectedElement$);
  const selectMode = useObservable(selectService.selectMode$);

  const { outline, treeNodeIdMap, refreshOutline } = useOutline(renderEntry);
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);

  const { expandedNodes, selectedElementNodeId } = useExpandedNodes({
    renderEntry,
    outline,
    treeNodeIdMap,
    selectedElement,
    collapsedNodes,
    setCollapsedNodes,
  });

  const safeClearOutlineHover = (node: OutlineElement) =>
    selectService.outlineHover$.getValue()?.id === node.id &&
    selectService.outlineHover$.next(undefined);

  return (
    <OutlineTree
      outline={outline}
      selectMode={selectMode}
      expanded={expandedNodes}
      selected={selectedElementNodeId || ""}
      onNodeToggle={(newExpandedNodes) =>
        // only store nodes that have been collapsed
        setCollapsedNodes(
          Array.from(treeNodeIdMap.keys()).filter(
            (n) => !newExpandedNodes.includes(n)
          )
        )
      }
      onExpandAllNodes={() => setCollapsedNodes([])}
      onRefresh={refreshOutline}
      onNodeSelected={async (node) => {
        if (!node.element) {
          enqueueSnackbar(
            "Selecting this type of component is not currently supported",
            { variant: "warning" }
          );
          return;
        }

        try {
          await selectService.invokeSelectModeAction(renderEntry, node.element);
        } catch (e) {
          enqueueSnackbar((e as Error)?.message || `${e}`);
        }
        safeClearOutlineHover(node);
      }}
      onNodeHover={(node) => selectService.outlineHover$.next(node)}
      onNodeHoverOut={safeClearOutlineHover}
    />
  );
}
