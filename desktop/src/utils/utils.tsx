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

export function streamToString(stream: Readable) {
  const chunks: Uint8Array[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}
