import { OutlineElement, OutlineElementType } from "../types/paint";
import { ReactFiber } from "../types/react-devtools";
import { ASTType } from "./ast/types";
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
    codeId: renderEntry.codeId,
    element: undefined,
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
  element: Element
): OutlineElement[] =>
  Array.from(element.children)
    .map((child) => {
      const lookupId = context.project.primaryElementEditor.getLookupIdFromHTMLElement(
        child as HTMLElement
      );
      if (lookupId) {
        const codeId = context.project.primaryElementEditor.getCodeIdFromLookupId(
          lookupId
        )!;
        return [
          {
            id: "", // ids are filled in later
            tag: child.tagName.toLowerCase(),
            type: OutlineElementType.Element,
            renderId: context.renderId,
            lookupId,
            codeId,
            element: child as HTMLElement,
            children: buildOutlineRecurse(context, child),
          },
        ];
      }
      return buildOutlineRecurse(context, child);
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
  node: ReactFiber
): Promise<OutlineElement[]> =>
  Promise.all(
    getChildrenFromFiber(node).map(
      async (child): Promise<OutlineElement[]> => {
        const lookupId = context.project.primaryElementEditor.getLookupIdFromProps(
          child.memoizedProps
        );
        if (!lookupId) return buildReactFiberRecurse(context, child);

        try {
          const codeId = context.project.primaryElementEditor.getCodeIdFromLookupId(
            lookupId
          )!;
          const codeEntry = context.project.getCodeEntryValue(codeId)!;
          const sourceMetadata = context.project.primaryElementEditor.getSourceMetaDataFromLookupId(
            { ast: (await codeEntry.getLatestAst()) as ASTType, codeEntry },
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
          const children = await buildReactFiberRecurse(context, child);

          // hide components that don't affect the dom
          if (!element && children.length === 0) {
            return [];
          }

          // collapse passthrough components, like material ui's button
          if (children.length === 1 && children[0]?.lookupId === lookupId) {
            return children;
          }

          return [
            {
              id: "", // ids are filled in later
              tag: typeof tag === "string" ? tag : "unknown",
              type: OutlineElementType.Element,
              renderId: context.renderId,
              lookupId,
              codeId,
              element,
              children,
            },
          ];
        } catch (e) {
          console.error("Error while building outline", e);
          return [];
        }
      }
    )
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
