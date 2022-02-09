import React, { useCallback, useEffect, useMemo, useState } from "react";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";

import { useObservable } from "../../hooks/useObservable";
import { useObservableCallback } from "../../hooks/useObservableCallback";
import { useService } from "../../hooks/useService";
import { buildOutline } from "../../lib/outline";
import {
  RenderEntry,
  RenderEntryCompileStatus,
} from "../../lib/project/RenderEntry";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { OutlineElement, OutlineElementType } from "../../types/paint";
import { IconButton } from "../IconButton";

const renderTree = (
  context: {
    renderEntry: RenderEntry;
    treeNodeIds: Set<string>;
    outline: OutlineElement[];

    onRefresh: () => void;
    onLabelClick: (node: OutlineElement) => void;
  },
  node: OutlineElement,
  nodeId = context.renderEntry.id + "=" + node.lookupId
) => {
  const { treeNodeIds } = context;
  // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
  if (treeNodeIds.has(nodeId)) {
    console.error("duplicate node id", nodeId, treeNodeIds, context.outline);
    return null;
  }
  treeNodeIds.add(nodeId);

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
  // const hasElementsForPrimaryCodeEntry = !!node.children.find((c) =>
  //   deepFindByCodeId(c, renderEntry.codeId)
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
  selectedElementUniqueId: string | undefined;
}

export function OutlinePaneEntry({
  renderEntry,
  selectedElementUniqueId,
}: Props) {
  const project = useProject();
  const selectService = useService(SelectService);
  const [outline, setOutline] = useState<OutlineElement[]>([]);

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

  const { treeNodeIds, renderedTree } = useMemo(() => {
    const treeNodeIds = new Set<string>();

    // render tree ahead of time to populate treeNodeIds
    const renderedTree = renderTree(
      {
        renderEntry,
        treeNodeIds,
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
      },
      {
        tag: renderEntry.name,
        type: OutlineElementType.Frame,
        renderId: renderEntry.id,
        lookupId: renderEntry.id,
        codeId: renderEntry.codeId,
        element: undefined,
        children: outline,
      }
    );

    return { treeNodeIds, renderedTree };
  }, [calculateOutline, outline, renderEntry, selectService]);

  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);
  return (
    <TreeView
      defaultCollapseIcon={<ExpandMoreIcon />}
      defaultExpandIcon={<ChevronRightIcon />}
      expanded={Array.from(treeNodeIds).filter(
        (i) => !collapsedNodes.includes(i)
      )}
      selected={selectedElementUniqueId || ""}
      onNodeToggle={(e, expandedNodes) =>
        // only store nodes that have been collapsed
        setCollapsedNodes(
          Array.from(treeNodeIds).filter((n) => !expandedNodes.includes(n))
        )
      }
    >
      {renderedTree}
    </TreeView>
  );
}
