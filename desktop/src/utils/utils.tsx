import { Readable } from "stream";

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
