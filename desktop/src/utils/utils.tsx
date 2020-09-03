import React from "react";
import { uniqueId } from "lodash";
import { Readable } from "stream";

import { Project } from "synergy/src/lib/project/Project";
import { OutlineElement } from "synergy/src/types/paint";

export const buildOutline = (
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

// this doesn't work in prod
let reactInstanceKey: string | undefined;
export const getReactDebugId = (element: HTMLElement) => {
  if (!reactInstanceKey)
    reactInstanceKey = Object.keys(element).find((key) =>
      key.startsWith("__reactInternalInstance")
    );
  if (!reactInstanceKey) return undefined;

  return (element as any)[reactInstanceKey]?._debugID;
};

export const getElementUniqueId = (element: HTMLElement): string => {
  if (!(element as any).paintId) {
    (element as any).paintId = uniqueId();
  }
  return (element as any).paintId;
};

export function streamToString(stream: Readable) {
  const chunks: Uint8Array[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export const renderSeparator = (title?: string, action?: React.ReactNode) => (
  <div className="flex items-center">
    {title && (
      <span className="pb-1 mr-2 text-sm text-gray-500 whitespace-no-wrap">
        {title}
      </span>
    )}
    <div className="w-full my-5 border-gray-600 border-solid border-b" />
    {action || null}
  </div>
);
