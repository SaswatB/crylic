import React, { FunctionComponent, useState } from "react";
import { faSync } from "@fortawesome/free-solid-svg-icons";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import TreeItem from "@material-ui/lab/TreeItem";
import TreeView from "@material-ui/lab/TreeView";
import { produce } from "immer";
import { distinctUntilChanged, map } from "rxjs/operators";

import { useBusSubscription } from "../../hooks/useBusSubscription";
import { useMemoObservable, useObservable } from "../../hooks/useObservable";
import { useService } from "../../hooks/useService";
import {
  componentViewCompileEnd,
  componentViewReload,
  componentViewRouteChange,
} from "../../lib/events";
import { Project } from "../../lib/project/Project";
import { renderSeparator } from "../../lib/render-utils";
import { getElementUniqueId } from "../../lib/utils";
import { CompilerContextService } from "../../services/CompilerContextService";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { OutlineElement, RenderEntry } from "../../types/paint";
import { IconButton } from "../IconButton";
import { Tour } from "../Tour/Tour";

const buildOutline = (
  project: Project,
  renderId: string,
  element: Element
): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      const lookupId = project.primaryElementEditor.getLookupIdFromHTMLElement(
        child as HTMLElement
      );
      if (lookupId) {
        return [
          {
            tag: child.tagName.toLowerCase(),
            renderId,
            lookupId,
            element: child as HTMLElement,
            children: buildOutline(project, renderId, child),
          },
        ];
      }
      return buildOutline(project, renderId, child);
    })
    .reduce((p, c) => [...p, ...c], []);

export const OutlinePane: FunctionComponent = () => {
  const project = useProject();
  const compilerContextService = useService(CompilerContextService);
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
  const calculateOutline = (renderId: string) => {
    const root = compilerContextService
      .getViewContext(renderId)
      ?.getRootElement();
    setOutlineMap(
      produce((currentOutlineMap) => {
        currentOutlineMap[renderId] = root
          ? buildOutline(project!, renderId, root)
          : undefined;
      })
    );
  };
  const calculateOutlineWithEntry = ({
    renderEntry,
  }: {
    renderEntry: RenderEntry;
  }) => calculateOutline(renderEntry.id);

  // recalculate the component view outline when the component view compiles, reloads, or changes its route
  useBusSubscription(componentViewCompileEnd, calculateOutlineWithEntry);
  useBusSubscription(componentViewReload, calculateOutlineWithEntry);
  useBusSubscription(componentViewRouteChange, calculateOutlineWithEntry);
  const renderEntries = useObservable(project?.renderEntries$);

  const outlines = Object.entries(outlineMap)
    .map(([key, value]) => ({
      outline: value,
      renderEntry: renderEntries!.find(({ id }) => id === key),
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
            onClick={() => calculateOutline(node.renderId)}
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
          if (node.element) {
            const lookupId = project?.primaryElementEditor.getLookupIdFromHTMLElement(
              node.element
            );
            if (lookupId) selectService.selectElement(node.renderId, lookupId);
          }
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
