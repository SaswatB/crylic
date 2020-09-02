import React, { FunctionComponent, useState } from "react";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";

import { IconButton } from "synergy/src/components/IconButton";

import { Project } from "../../lib/project/Project";
import {
  OutlineElement,
  RenderEntry,
  SelectedElement,
} from "../../types/paint";
import { getElementUniqueId, renderSeparator } from "../../utils/utils";
import { Tour } from "../Tour";

interface Props {
  project: Project;
  outlineMap: Record<string, OutlineElement[] | undefined>;
  refreshOutline: (renderId: string) => void;
  selectedElement: SelectedElement | undefined;
  selectElement: (renderId: string, componentElement: HTMLElement) => void;
}

export const OutlinePane: FunctionComponent<Props> = ({
  project,
  outlineMap,
  refreshOutline,
  selectedElement,
  selectElement,
}) => {
  const outlines = Object.entries(outlineMap)
    .map(([key, value]) => ({
      outline: value,
      renderEntry: project.renderEntries.find(({ id }) => id === key),
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
    const treeLabel = (
      <div className="flex">
        {node.tag}
        <div className="flex-1" />
        {/* if element isn't defined, this is probably the frame element */}
        {!node.element && (
          <IconButton
            title="Refresh Outline"
            icon={faSync}
            onClick={() => refreshOutline(node.renderId)}
          />
        )}
      </div>
    );
    return (
      <TreeItem
        key={id}
        nodeId={id}
        label={treeLabel}
        onLabelClick={(e) => {
          e.preventDefault();
          if (node.element) selectElement(node.renderId, node.element);
        }}
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

  // todo maybe store lookupIds here? (nodeIds currently clear on refresh)
  const [collapsedNodes, setCollapsedNodes] = useState<string[]>([]);
  return (
    <>
      {project.renderEntries.length > 0 && (
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
          selected={
            selectedElement
              ? `${getElementUniqueId(selectedElement.element)}`
              : ""
          }
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
