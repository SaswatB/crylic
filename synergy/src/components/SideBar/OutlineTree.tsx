import React from "react";
import {
  faChevronDown,
  faChevronRight,
  faExpandAlt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";

import { OutlineElement, OutlineElementType } from "../../types/paint";
import { IconButton } from "../IconButton";

interface TreeContext {
  expanded: string[];
  selected: string;
  onRefresh: () => void;
  onExpandAllNodes: () => void;
  onNodeToggle: (newExpandedNodes: string[]) => void;
  onNodeSelected: (node: OutlineElement) => void;
  onNodeHover: (node: OutlineElement) => void;
  onNodeHoverOut: (node: OutlineElement) => void;
}

interface OutlineTreeItemProps extends TreeContext {
  node: OutlineElement;
}

function OutlineTreeItem({ node, ...context }: OutlineTreeItemProps) {
  const isExpanded = context.expanded.includes(node.id);
  const isSelected = node.id === context.selected;

  const renderChildrenToggle = () =>
    isExpanded ? (
      <IconButton
        icon={faChevronDown}
        className="text-xs"
        onClick={() =>
          context.onNodeToggle(context.expanded.filter((id) => id !== node.id))
        }
      />
    ) : (
      <IconButton
        icon={faChevronRight}
        className="text-xs"
        onClick={() => context.onNodeToggle([...context.expanded, node.id])}
      />
    );

  return (
    <div>
      <div className="flex">
        {node.children.length > 0 && renderChildrenToggle()}
        <div
          className={`flex flex-1 ml-1 pl-1 bg-gray-500 bg-opacity-0 hover:bg-opacity-50 cursor-pointer ${
            isSelected && "bg-opacity-25"
          }`}
          onClick={() => context.onNodeSelected(node)}
          onMouseOver={() => context.onNodeHover(node)}
          onMouseOut={() => context.onNodeHoverOut(node)}
        >
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
      </div>
      {isExpanded ? (
        <div
          className="border-l border-gray-700"
          style={{ marginLeft: 5, paddingLeft: 10 }}
        >
          {node.children.map((child) => (
            <OutlineTreeItem key={child.id} node={child} {...context} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface OutlineTreeProps extends TreeContext {
  outline: OutlineElement | undefined;
}

export function OutlineTree({ outline, ...context }: OutlineTreeProps) {
  if (!outline) return null;

  return <OutlineTreeItem node={outline} {...context} />;
}
