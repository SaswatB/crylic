import React, { FunctionComponent, useState } from "react";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";
import { produce } from "immer";
import { distinctUntilChanged, map } from "rxjs/operators";

import { useMemoObservable, useObservable } from "../../hooks/useObservable";
import { useService } from "../../hooks/useService";
import { buildOutline, deepFindByCodeId } from "../../lib/outline";
import { RenderEntry } from "../../lib/project/RenderEntry";
import { renderSeparator } from "../../lib/render-utils";
import { getElementUniqueId } from "../../lib/utils";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { OutlineElement, OutlineElementType } from "../../types/paint";
import { IconButton } from "../IconButton";
import { Tour } from "../Tour/Tour";

export const OutlinePane: FunctionComponent = () => {
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedElementUniqueId = useMemoObservable(
    () =>
      selectService.selectedElement$.pipe(
        map((selectedElement) =>
          selectedElement
            ? `${getElementUniqueId(selectedElement.element)}`
            : undefined
        ),
        distinctUntilChanged()
      ),
    [selectService]
  );

  const [outlineMap, setOutlineMap] = useState<
    Record<string, OutlineElement[] | undefined>
  >({});
  const calculateOutline = async (renderEntry: RenderEntry) => {
    // todo debounce
    const outline = await buildOutline(project, renderEntry);
    setOutlineMap(
      produce((currentOutlineMap) => {
        currentOutlineMap[renderEntry.id] = outline;
      })
    );
  };
  const calculateOutlineWithEntry = ({
    renderEntry,
  }: {
    renderEntry: RenderEntry;
  }) => calculateOutline(renderEntry);

  // recalculate the component view outline when the component view compiles, reloads, or changes its route
  useBusSubscription(componentViewCompileEnd, calculateOutlineWithEntry);
  useBusSubscription(componentViewReload, calculateOutlineWithEntry);
  useBusSubscription(componentDomChange, calculateOutlineWithEntry);
  const renderEntries = useObservable(project?.renderEntries$);

  const outlines = Object.entries(outlineMap)
    .map(([key, value]) => ({
      outline: value,
      renderEntry: renderEntries.find(({ id }) => id === key),
    }))
    .filter(
      (
        e
      ): e is {
        outline: OutlineElement[];
        renderEntry: RenderEntry;
      } => !!e.outline && !!e.renderEntry
    );

  let treeNodeIds = new Set<string>();
  const renderTree = (
    node: OutlineElement,
    renderEntry: RenderEntry,
    nodeId = node.lookupId
  ) => {
    // it's very important not to render duplicate node ids https://github.com/mui-org/material-ui/issues/20832
    if (treeNodeIds.has(nodeId)) {
      console.error("duplicate node id", nodeId, treeNodeIds, outlines);
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
            onClick={() => calculateOutline(renderEntry)}
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
          if (node.element) {
            void selectService.selectElement(renderEntry, {
              htmlElement: node.element,
            });
          }
        }}
      >
        {hasElementsForPrimaryCodeEntry
          ? node.children.map((c) =>
              renderTree(
                c,
                renderEntry,
                `${nodeId}:${node.children
                  .filter((sc) => c.lookupId === sc.lookupId)
                  .indexOf(c)}-${c.lookupId}`
              )
            )
          : null}
      </TreeItem>
    );
  };

  // render tree ahead of time to populate treeNodeIds
  const renderedTree = outlines.map(({ outline, renderEntry }) =>
    renderTree(
      {
        tag: renderEntry.name,
        type: OutlineElementType.Frame,
        renderId: renderEntry.id,
        lookupId: renderEntry.id,
        codeId: renderEntry.codeId,
        element: undefined,
        children: outline,
      },
      renderEntry
    )
  );

  // todo maybe store lookupIds here? (nodeIds currently clear on refresh)
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);
  return (
    <>
      {(renderEntries?.length || 0) > 0 && (
        <Tour
          name="outline-tab"
          beaconStyle={{
            marginTop: 20,
            marginLeft: 43,
          }}
        >
          This is the outline view, here you can see all the elements in your
          component. <br />
          Click on one to edit it!
        </Tour>
      )}
      <div
        data-tour="outline-tab"
        className="flex-1 overflow-auto"
        style={{ minHeight: 200 }}
      >
        {renderSeparator("Outline")}
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
      </div>
    </>
  );
};
