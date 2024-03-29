import React, { useMemo, useRef, useState } from "react";
import { useSnackbar } from "notistack";

import { useObservable } from "../../hooks/useObservable";
import { useService } from "../../hooks/useService";
import { useUpdatingRef } from "../../hooks/useUpdatingRef";
import { updateElementHelper } from "../../lib/ast/code-edit-helpers";
import { findEntryRecurse } from "../../lib/outline";
import { RenderEntry } from "../../lib/project/RenderEntry";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { OutlineElement, OutlineElementType } from "../../types/paint";
import {
  SelectedElement,
  SelectedElementTargetType,
} from "../../types/selected-element";
import { OutlineTree } from "./OutlineTree";

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
      findEntryRecurse([outline], (n) => {
        switch (selectedElement.target.type) {
          case SelectedElementTargetType.Component:
            return n.element === selectedElement.target.element;
          case SelectedElementTargetType.VirtualComponent:
            return (
              n.lookupId === selectedElement.target.lookupId &&
              n.lookupIdIndex === selectedElement.target.index
            );
          case SelectedElementTargetType.RenderEntry:
            return (
              n.type === OutlineElementType.Frame &&
              n.renderId === selectedElement.renderEntry.id
            );
          default:
            console.error(
              "unhandled selected element target type",
              // @ts-expect-error this line will cause a type error if a type is not handled
              selectedElement.target.type
            );
        }
        return false;
      }) || {};
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
  openUrl: (url: string) => void;
}

export function OutlinePaneEntry({ renderEntry, openUrl }: Props) {
  const { enqueueSnackbar } = useSnackbar();
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedElement = useObservable(selectService.selectedElement$);
  const selectMode = useObservable(selectService.selectMode$);

  const { outline, treeNodeIdMap } = useObservable(renderEntry.outline$) || {};
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);

  const { expandedNodes, selectedElementNodeId } = useExpandedNodes({
    renderEntry,
    outline,
    treeNodeIdMap: treeNodeIdMap || new Map(),
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
      openUrl={openUrl}
      onNodeToggle={(newExpandedNodes) =>
        // only store nodes that have been collapsed
        treeNodeIdMap &&
        setCollapsedNodes(
          Array.from(treeNodeIdMap.keys()).filter(
            (n) => !newExpandedNodes.includes(n)
          )
        )
      }
      onExpandAllNodes={() => setCollapsedNodes([])}
      onRefresh={renderEntry.refreshOutline}
      onNodeSelected={async (node, hints) => {
        try {
          await selectService.invokeSelectModeAction(
            renderEntry,
            node.type === OutlineElementType.Frame
              ? undefined
              : node.element
              ? { htmlElement: node.element }
              : {
                  lookupId: node.lookupId,
                  index: node.lookupIdIndex,
                },
            hints
          );
        } catch (e) {
          console.error(e);
          enqueueSnackbar((e as Error)?.message || `${e}`, {
            variant: "error",
          });
        }
        safeClearOutlineHover(node);
      }}
      onNodeMoved={async (node, newParent, hints) => {
        if (node.id === newParent.id) return;
        if (findEntryRecurse(node.children, (n) => n.id === newParent.id)) {
          enqueueSnackbar("Unable to move this component to its own child", {
            variant: "error",
          });
          return;
        }

        try {
          await updateElementHelper(
            project,
            node.lookupId,
            (editor, editContext) =>
              editor.moveElement(
                editContext,
                newParent.lookupId,
                hints?.beforeChildLookupId
              )
          );
          selectService.clearSelectedElement();
        } catch (e) {
          enqueueSnackbar((e as Error)?.message || `${e}`, {
            variant: "error",
          });
        }
      }}
      onNodeHover={(node) => selectService.outlineHover$.next(node)}
      onNodeHoverOut={safeClearOutlineHover}
    />
  );
}
