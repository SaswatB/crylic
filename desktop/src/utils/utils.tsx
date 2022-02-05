import { Readable } from "stream";

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");

export function streamToString(stream: Readable) {
  const chunks: Uint8Array[] = [];
  return new Promise<string>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export function requireUncached(module: string) {
  delete __non_webpack_require__.cache[__non_webpack_require__.resolve(module)];
  return __non_webpack_require__(module);
}

export function getAppNodeModules() {
  let nodeModulesPath = __non_webpack_require__
    .resolve("webpack")
    .replace(/(app[/\\])?node_modules[/\\].*$/, "");
  if (fs.existsSync(path.join(nodeModulesPath, "desktop"))) {
    // only for dev
    nodeModulesPath = path.join(nodeModulesPath, "desktop");
  }
  if (fs.existsSync(path.join(nodeModulesPath, "app"))) {
    nodeModulesPath = path.join(nodeModulesPath, "app");
  }
  return path.join(nodeModulesPath, "node_modules/");
}
