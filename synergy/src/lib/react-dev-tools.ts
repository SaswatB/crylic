import { ReactFiber } from "../types/react-devtools";

export function getChildrenFromFiber(fiber: ReactFiber) {
  let lastChild = fiber.child;
  if (!lastChild) return [];

  const children = [lastChild];
  while (lastChild.sibling) {
    lastChild = lastChild.sibling;
    children.push(lastChild);
  }

  return children;
}

export function findFiber(
  fiber: ReactFiber,
  predicate: (fiber: ReactFiber) => boolean
): ReactFiber | undefined {
  if (predicate(fiber)) return fiber;

  const children = getChildrenFromFiber(fiber);
  for (const child of children) {
    const found = findFiber(child, predicate);
    if (found) return found;
  }
  return undefined;
}
