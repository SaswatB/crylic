import { DepthNode } from "./dom-depth";

// export interface RenderNode {
//   node: DepthNode;
//   layer: number;
// }

export function buildRenderTree(node: DepthNode) {
  const layers = [[node]];
  node.staticChildren.forEach((child) => {
    buildRenderTree(child);
  });
}
