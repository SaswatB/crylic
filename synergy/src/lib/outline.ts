import { OutlineElement, OutlineElementType } from "../types/paint";
import { ReactFiber } from "../types/react-devtools";
import { createNewReadContext } from "./ast/editors/ASTEditor";
import { Project } from "./project/Project";
import { RenderEntry } from "./project/RenderEntry";
import { getChildrenFromFiber } from "./react-dev-tools";

export const buildOutline = async (
  project: Project,
  renderEntry: RenderEntry,
  root: Element,
  fiberComponentRoot: ReactFiber | undefined
) => {
  const outline: OutlineElement = {
    id: "", // ids are filled in later
    tag: renderEntry.name,
    type: OutlineElementType.Frame,
    renderId: renderEntry.id,
    lookupId: renderEntry.id,
    lookupIdIndex: 0,
    codeId: renderEntry.codeId,
    element: undefined,
    closestElements: [],
    children: await (fiberComponentRoot
      ? buildReactFiberRecurse(
          { project, renderId: renderEntry.id },
          fiberComponentRoot
        )
      : buildOutlineRecurse({ project, renderId: renderEntry.id }, root)),
  };
  generateIds(outline, renderEntry.id + "=");
  return outline;
};

function generateIds(node: OutlineElement, nodeId: string) {
  node.id = nodeId;
  node.children.forEach((c) =>
    generateIds(
      c,
      `${nodeId}:${node.children
        .filter((sc) => c.lookupId === sc.lookupId)
        .indexOf(c)}-${c.lookupId}`
    )
  );
}

const buildOutlineRecurse = (
  context: {
    project: Project;
    renderId: string;
  },
  element: Element,
  lookupIdCountMap: Record<string, number | undefined> = {}
): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      const lookupId =
        context.project.primaryElementEditor.getLookupIdFromHTMLElement(
          child as HTMLElement
        );
      if (lookupId) {
        const codeId =
          context.project.primaryElementEditor.getCodeIdFromLookupId(lookupId)!;
        lookupIdCountMap[lookupId] = lookupIdCountMap[lookupId] || 0;
        return [
          {
            id: "", // ids are filled in later
            tag: child.tagName.toLowerCase(),
            type: OutlineElementType.Element,
            renderId: context.renderId,
            lookupId,
            lookupIdIndex: lookupIdCountMap[lookupId]!++,
            codeId,
            element: child as HTMLElement,
            closestElements: [child as HTMLElement],
            children: buildOutlineRecurse(context, child, lookupIdCountMap),
          },
        ];
      }
      return buildOutlineRecurse(context, child, lookupIdCountMap);
    })
    .reduce((p, c) => [...p, ...c], []);

function isHTMLElement(o: unknown): o is HTMLElement {
  return typeof o === "object" && o !== null && (o as any).nodeType === 1;
}

const buildReactFiberRecurse = (
  context: {
    project: Project;
    renderId: string;
  },
  node: ReactFiber,
  lookupIdCountMap: Record<string, number> = {}
): Promise<OutlineElement[]> =>
  Promise.all(
    getChildrenFromFiber(node).map(async (child): Promise<OutlineElement[]> => {
      const lookupId =
        context.project.primaryElementEditor.getLookupIdFromProps(
          child.memoizedProps
        );
      if (!lookupId)
        return buildReactFiberRecurse(context, child, lookupIdCountMap);

      try {
        const codeId =
          context.project.primaryElementEditor.getCodeIdFromLookupId(lookupId)!;
        const codeEntry = context.project.getCodeEntryValue(codeId)!;
        const sourceMetadata =
          context.project.primaryElementEditor.getSourceMetaDataFromLookupId(
            await createNewReadContext(codeEntry),
            lookupId
          );

        const tag =
          sourceMetadata?.componentName ||
          child.type?.displayName ||
          child.type?.name ||
          child.type;
        const element = isHTMLElement(child.stateNode)
          ? child.stateNode
          : undefined;
        const children = await buildReactFiberRecurse(
          context,
          child,
          lookupIdCountMap
        );

        // hide components that don't affect the dom
        if (!element && children.length === 0) {
          return [];
        }

        // collapse passthrough components, like material ui's button
        if (children.length === 1 && children[0]?.lookupId === lookupId) {
          return children;
        }

        const closestElements: HTMLElement[] = [];
        if (element) {
          closestElements.push(element);
        } else {
          closestElements.push(
            ...children
              .map((c) => c.closestElements)
              .reduce((p, c) => [...p, ...c], [])
          );
        }

        lookupIdCountMap[lookupId] = lookupIdCountMap[lookupId] || 0;
        return [
          {
            id: "", // ids are filled in later
            tag: typeof tag === "string" ? tag : "unknown",
            type: OutlineElementType.Element,
            renderId: context.renderId,
            lookupId,
            lookupIdIndex: lookupIdCountMap[lookupId]!++,
            codeId,
            element,
            closestElements,
            children,
          },
        ];
      } catch (e) {
        console.error("Error while building outline", e);
        return [];
      }
    })
  ).then((r) => r.reduce((p, c) => [...p, ...c], []));

export const findEntryRecurse = (
  elements: OutlineElement[],
  predicate: (element: OutlineElement) => boolean,
  path: OutlineElement[] = []
): { element: OutlineElement; path: OutlineElement[] } | undefined => {
  for (const element of elements) {
    if (predicate(element)) return { element: element, path };
    const res = findEntryRecurse(element.children, predicate, [
      ...path,
      element,
    ]);
    if (res) return res;
  }
  return undefined;
};
