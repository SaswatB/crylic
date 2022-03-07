import React from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  faChevronDown,
  faChevronRight,
  faExpandAlt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";

import {
  SelectMode,
  SelectModeCursor,
  SelectModeHints,
  SelectModeType,
} from "../../constants";
import { OutlineElement, OutlineElementType } from "../../types/paint";
import { IconButton } from "../IconButton";

interface TreeContext {
  selectMode?: SelectMode;
  expanded: string[];
  selected: string;
  onRefresh: () => void;
  onExpandAllNodes: () => void;
  onNodeToggle: (newExpandedNodes: string[]) => void;
  onNodeSelected: (node: OutlineElement, hints?: SelectModeHints) => void;
  onNodeMoved: (
    node: OutlineElement,
    newParent: OutlineElement,
    hints?: SelectModeHints
  ) => void;
  onNodeHover: (node: OutlineElement) => void;
  onNodeHoverOut: (node: OutlineElement) => void;
}

function isSelectModeNotSelectElement(context: TreeContext) {
  return (
    (context.selectMode?.type || SelectModeType.SelectElement) !==
    SelectModeType.SelectElement
  );
}

interface OutlineTreeItemInsertProp extends TreeContext {
  dragType: string;
  node: OutlineElement;
  cursor: string;
  hints?: SelectModeHints;
}

function OutlineTreeItemInsert({
  dragType,
  node,
  cursor,
  hints,
  ...context
}: OutlineTreeItemInsertProp) {
  const [{ isOver }, drop] = useDrop<
    OutlineElement,
    unknown,
    { isOver: boolean }
  >(
    () => ({
      accept: dragType,
      drop: (droppedNode) => context.onNodeMoved(droppedNode, node, hints),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    []
  );

  return (
    <div
      ref={drop}
      style={{ height: 2, cursor }}
      className={`default-transition ${
        isSelectModeNotSelectElement(context) ? "hover:bg-white" : ""
      } ${isOver ? "bg-white" : ""}`}
      onClick={() =>
        isSelectModeNotSelectElement(context) &&
        context.onNodeSelected(node, hints)
      }
    />
  );
}

interface OutlineTreeItemProps extends TreeContext {
  node: OutlineElement;
}

function OutlineTreeItem({ node, ...context }: OutlineTreeItemProps) {
  const dragType = `OutlineTreeItem-${node.renderId}`;
  const [, drag] = useDrag<OutlineElement>(
    () => ({
      type: dragType,
      item: node,
    }),
    [node]
  );
  const [{ isOver }, drop] = useDrop<
    OutlineElement,
    unknown,
    { isOver: boolean }
  >(
    () => ({
      accept: dragType,
      drop: (droppedNode) => context.onNodeMoved(droppedNode, node),
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
      }),
    }),
    [node]
  );

  const isExpanded = context.expanded.includes(node.id);
  const isSelected = node.id === context.selected;

  const cursor = isSelectModeNotSelectElement(context)
    ? SelectModeCursor[context.selectMode!.type]
    : "pointer";

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

  const renderLabel = () => (
    <div
      ref={drag}
      className={`flex flex-1 ml-1 pl-1 bg-gray-500 bg-opacity-0 hover:bg-opacity-50 ${
        isSelected && "bg-opacity-25"
      }`}
      style={{ cursor }}
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
            onClick={(e) => {
              e.stopPropagation();
              context.onExpandAllNodes();
            }}
          />
          {/* todo: use a better icon as this icon implies the frame will be refreshed */}
          <IconButton
            title="Refresh Outline"
            icon={faSync}
            onClick={(e) => {
              e.stopPropagation();
              context.onRefresh();
            }}
          />
        </>
      )}
    </div>
  );

  const renderChildInserts = (hints?: SelectModeHints) => (
    <OutlineTreeItemInsert
      dragType={dragType}
      node={node}
      cursor={cursor}
      hints={hints}
      {...context}
    />
  );

  const renderChildren = () => (
    <div
      className="border-l border-gray-700"
      style={{ marginLeft: 5, paddingLeft: 10 }}
    >
      {node.children.map((child, index) => (
        <React.Fragment key={child.id}>
          {renderChildInserts({ beforeChildLookupId: child.lookupId })}
          <OutlineTreeItem node={child} {...context} />
          {index === node.children.length - 1 ? renderChildInserts() : null}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div>
      <div
        ref={drop}
        className={`flex border ${
          isOver ? "border-white" : "border-transparent"
        }`}
      >
        {node.children.length > 0 ? renderChildrenToggle() : null}
        {renderLabel()}
      </div>
      {isExpanded ? renderChildren() : null}
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
