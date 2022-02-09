import React, { useCallback, useEffect, useMemo, useState } from "react";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";

import { useObservable } from "../../hooks/useObservable";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { useService } from "../../hooks/useService";
import { buildOutline, findEntryRecurse } from "../../lib/outline";
import {
  RenderEntry,
  RenderEntryCompileStatus,
} from "../../lib/project/RenderEntry";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { OutlineElement, OutlineElementType } from "../../types/paint";
import { IconButton } from "../IconButton";

interface RenderTreeContext {
  renderEntry: RenderEntry;
  treeNodeIdMap: Map<string, OutlineElement>;
  outline: OutlineElement[];

  onRefresh: () => void;
  onLabelClick: (node: OutlineElement) => void;
}

const renderTree = (
  context: RenderTreeContext,
  node: OutlineElement,
  nodeId = context.renderEntry.id + "=" + node.lookupId
) => {
  const { renderEntry, treeNodeIdMap } = context;
  // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
  if (treeNodeIdMap.has(nodeId)) {
    console.error("duplicate node id", nodeId, treeNodeIdMap, context.outline);
    return null;
  }
  treeNodeIdMap.set(nodeId, node);

  const treeLabel = (
    <div className="flex">
      {node.tag}
      <div className="flex-1" />
      {node.type === OutlineElementType.Frame && (
        // todo: use a better icon as this icon implies the frame will be refreshed
        <IconButton
          title="Refresh Outline"
          icon={faSync}
          onClick={context.onRefresh}
        />
      )}
    </div>
  );
  // const hasElementsForPrimaryCodeEntry = !!findEntryRecurse(
  //   node.children,
  //   (c) => c.codeId === renderEntry.codeId
  // );
  const hasElementsForPrimaryCodeEntry = true;

  return (
    <TreeItem
      key={nodeId}
      nodeId={nodeId}
      label={treeLabel}
      onLabelClick={(e) => {
        e.preventDefault();
        context.onLabelClick(node);
      }}
    >
      {hasElementsForPrimaryCodeEntry
        ? node.children.map((c) =>
            renderTree(
              context,
              c,
              `${nodeId}:${node.children
                .filter((sc) => c.lookupId === sc.lookupId)
                .indexOf(c)}-${c.lookupId}`
            )
          )
        : null}
    </TreeItem>
  );
};

interface Props {
  renderEntry: RenderEntry;
}

export function OutlinePaneEntry({ renderEntry }: Props) {
  const project = useProject();
  const selectService = useService(SelectService);
  const [outline, setOutline] = useState<OutlineElement[]>([]);

  const selectedElement = useObservable(selectService.selectedElement$);
  const viewContext = useObservable(renderEntry.viewContext$);
  const reactMetadata = useObservable(renderEntry.reactMetadata$);

  const calculateOutline = useCallback(async () => {
    // todo debounce
    const rootElement = viewContext?.getRootElement();
    if (!rootElement) return;

    setOutline(
      (await buildOutline(
        project,
        renderEntry.id,
        rootElement,
        reactMetadata?.fiberComponentRoot
      )) || []
    );
  }, [project, reactMetadata, renderEntry.id, viewContext]);

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

  const { treeNodeIdMap, renderedTree } = useMemo(() => {
    const renderTreeContext: RenderTreeContext = {
      renderEntry,
      treeNodeIdMap: new Map<string, OutlineElement>(),
      outline,
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
    };

    return {
      treeNodeIdMap: renderTreeContext.treeNodeIdMap,
      renderedTree: renderTree(renderTreeContext, {
        tag: renderEntry.name,
        type: OutlineElementType.Frame,
        renderId: renderEntry.id,
        lookupId: renderEntry.id,
        codeId: renderEntry.codeId,
        element: undefined,
        children: outline,
      }),
    };
  }, [calculateOutline, outline, renderEntry, selectService]);

  const selectedElementNodeId = useMemo(() => {
    if (selectedElement?.renderEntry !== renderEntry) return undefined;

    const node = findEntryRecurse(
      outline,
      (n) => n.element === selectedElement.element
    );
    if (!node) return;

    return Array.from(treeNodeIdMap.entries()).find(([, n]) => n === node)?.[0];
  }, [outline, renderEntry, selectedElement, treeNodeIdMap]);

  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);
  const expandedNodes = useMemo(
    () =>
      Array.from(treeNodeIdMap.keys()).filter(
        (i) => !collapsedNodes.includes(i)
      ),
    [collapsedNodes, treeNodeIdMap]
  );
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
