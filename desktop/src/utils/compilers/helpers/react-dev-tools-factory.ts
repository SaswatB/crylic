import {
  ReactDevToolsHook,
  ReactFiberRoot,
} from "synergy/src/types/react-devtools";

export const reactDevToolsFactory = (
  onReactFiberRootInject: (root: ReactFiberRoot) => void
): Partial<ReactDevToolsHook> => {
  const fiberRoots: Record<number, Set<ReactFiberRoot>> = {};
  function getFiberRoots(rendererID: number) {
    let roots = fiberRoots[rendererID];
    if (!roots) {
      fiberRoots[rendererID] = roots = new Set();
    }
    return roots;
  }

  let counter = 0;
  const renderers = new Map();

  return {
    renderers,
    supportsFiber: true,
    inject: (renderer) => {
      const id = counter++;
      renderers.set(id, renderer);
      return id;
    },
    getFiberRoots,
    onCommitFiberRoot(id, root, maybePriorityLevel) {
      const mountedRoots = getFiberRoots(id);
      const isKnownRoot = mountedRoots.has(root);
      const isUnmounting =
        root.current.memoizedState == null ||
        root.current.memoizedState.element == null;

      // Keep track of mounted roots so we can hydrate when DevTools connect.
      if (!isKnownRoot && !isUnmounting) {
        mountedRoots.add(root);
        onReactFiberRootInject(root);
      } else if (isKnownRoot && isUnmounting) {
        mountedRoots.delete(root);
      }
    },
    onCommitFiberUnmount() {},
  };
};
