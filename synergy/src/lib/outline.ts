import { OutlineElement, OutlineElementType } from "../types/paint";
import { ReactFiber } from "../types/react-devtools";
import { ASTType } from "./ast/types";
import { Project } from "./project/Project";
import { RenderEntry } from "./project/RenderEntry";
import { getChildrenFromFiber } from "./react-dev-tools";

export const buildOutline = async (
  project: Project,
  renderEntry: RenderEntry
) => {
  const root = renderEntry.viewContext$.getValue()?.getRootElement();
  if (!root) return undefined;

  const fiberComponentRoot = renderEntry.reactMetadata$.getValue()
    ?.fiberComponentRoot;

  return fiberComponentRoot
    ? buildReactFiberRecurse(
        { project, renderId: renderEntry.id },
        fiberComponentRoot
      )
    : buildOutlineRecurse({ project, renderId: renderEntry.id }, root);
};

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
        if (lookupId) {
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
          const element = child.stateNode as HTMLElement | undefined;
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
              tag: typeof tag === "string" ? tag : "unknown",
              type: OutlineElementType.Element,
              renderId: context.renderId,
              lookupId,
              codeId,
              element,
              children,
            },
          ];
        }
        return buildReactFiberRecurse(context, child);
      }
    )
  ).then((r) => r.reduce((p, c) => [...p, ...c], []));

export const deepFindByCodeId = (
  element: OutlineElement,
  codeId: string
): OutlineElement | undefined => {
  if (element.codeId === codeId) return element;
  return element.children.find((c) => deepFindByCodeId(c, codeId));
};
