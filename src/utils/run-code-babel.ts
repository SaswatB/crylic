import * as Babel from "@babel/standalone";
import vm from "vm";

const module = __non_webpack_require__("module") as typeof import("module");
const fs = __non_webpack_require__("fs") as typeof import("fs");

const BABEL_PRESETS = ["es2015", "react", "typescript"];
const BABEL_PLUGINS = ["proposal-class-properties"];

// todo clear cache button
let cache: Record<string, Record<string, unknown> | undefined> = {};

export const babelRunCode = (codePath: string | undefined, originalCode: string) => {
  const startTime = new Date().getTime();
  console.log("loading...", codePath);
  const code = Babel.transform(originalCode, { filename: codePath || 'untitled', presets: BABEL_PRESETS, plugins: BABEL_PLUGINS }).code || '';
  const moduleRequire = codePath
    ? module.createRequire(codePath)
    : __non_webpack_require__;
  let moduleExports: any = {};
  let exports: any = {};
  try {
    vm.runInNewContext(code, {
      process,
      module: moduleExports,
      exports,
      require: (name: string) => {
        if (name === "react") return require("react");
        if (name === "react-dom") return require("react-dom");

        if ((codePath || "") in cache && name in cache[codePath || ""]!) {
          return cache[codePath || ""]![name];
        }

        if (name.endsWith('.css') || name.endsWith('.scss') || name.endsWith('.sass')) return {};

        let subRequirePath;
        try {
          subRequirePath = moduleRequire.resolve(name);
        } catch (e) {
          try {
            subRequirePath = moduleRequire.resolve(`${name}.ts`);
          } catch (e2) {
            try {
              subRequirePath = moduleRequire.resolve(`${name}.tsx`);
            } catch(e3) {
              throw e;
            }
          }
        }
        const codeExports = babelRunCode(
          subRequirePath,
          fs.readFileSync(subRequirePath, { encoding: "utf-8" }),
        );
        cache[codePath || ""] = cache[codePath || ""] || {};
        cache[codePath || ""]![name] = codeExports;
        return codeExports;
      },
    });
  } catch (error) {
    console.log("error file", codePath, error);
    throw error;
  }
  const endTime = new Date().getTime();
  console.log("loaded", codePath, endTime - startTime);
  return moduleExports.exports || exports;
};
