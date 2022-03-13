import { parse } from "jsonc-parser";
import { isArray } from "lodash";

const path = __non_webpack_require__("path") as typeof import("path");
const fs = __non_webpack_require__("fs") as typeof import("fs");

// Module resolution code from cra
// https://github.com/facebook/create-react-app/blob/main/packages/react-scripts/config/modules.js

/**
 * Get additional module paths based on the baseUrl of a compilerOptions object.
 */
function getAdditionalModulePaths(
  options: { baseUrl?: string },
  paths: {
    projectFolder: string;
    projectSrcFolder: string;
    projectNodeModules: string;
  }
) {
  const baseUrl = options.baseUrl;

  if (!baseUrl) {
    return "";
  }

  const baseUrlResolved = path.resolve(paths.projectFolder, baseUrl);

  // We don't need to do anything if `baseUrl` is set to `node_modules`. This is
  // the default behavior.
  if (path.relative(paths.projectNodeModules, baseUrlResolved) === "") {
    return null;
  }

  // Allow the user set the `baseUrl` to `appSrc`.
  if (path.relative(paths.projectSrcFolder, baseUrlResolved) === "") {
    return [paths.projectSrcFolder];
  }

  // If the path is equal to the root directory we ignore it here.
  // We don't want to allow importing from the root directly as source files are
  // not transpiled outside of `src`. We do allow importing them with the
  // absolute path (e.g. `src/Components/Button.js`) but we set that up with
  // an alias.
  if (path.relative(paths.projectFolder, baseUrlResolved) === "") {
    return null;
  }

  // Otherwise, throw an error.
  throw new Error(
    "Your project's `baseUrl` can only be set to `src` or `node_modules`." +
      " Create React App does not support other values at this time."
  );
}

/**
 * Get webpack aliases based on the baseUrl of a compilerOptions object.
 */
function getWebpackAliases(
  options: {
    baseUrl?: string;
    paths?: Record<string, string[]>;
  },
  paths: { projectFolder: string; projectSrcFolder: string }
): { src: string } | {} {
  const aliases: Record<string, string> = {};

  const baseUrl = options.baseUrl;
  const baseUrlResolved = baseUrl && path.resolve(paths.projectFolder, baseUrl);
  if (
    baseUrlResolved &&
    path.relative(paths.projectFolder, baseUrlResolved) === ""
  ) {
    aliases.src = paths.projectSrcFolder;
  }

  // this part is not from react-scripts, but helps with next.js support
  if (options.paths) {
    Object.entries(options.paths).forEach(([key, value]) => {
      if (isArray(value) && value.length === 1) {
        aliases[key] = path.resolve(
          baseUrlResolved || paths.projectFolder,
          value[0]!
        );
      }
    });
  }

  return aliases;
}

export function getCraModules(paths: {
  projectFolder: string;
  projectSrcFolder: string;
  projectNodeModules: string;
}) {
  const appTsConfig = path.resolve(paths.projectFolder, "tsconfig.json");
  const appJsConfig = path.resolve(paths.projectFolder, "jsconfig.json");

  // Check if TypeScript is setup
  const hasTsConfig = fs.existsSync(appTsConfig);
  const hasJsConfig = fs.existsSync(appJsConfig);

  if (hasTsConfig && hasJsConfig) {
    throw new Error(
      "You have both a tsconfig.json and a jsconfig.json. If you are using TypeScript please remove your jsconfig.json file."
    );
  }

  let config;

  // If there's a tsconfig.json we assume it's a
  // TypeScript project and set up the config
  // based on tsconfig.json
  if (hasTsConfig) {
    config = parse(fs.readFileSync(appTsConfig, { encoding: "utf8" }));
    // Otherwise we'll check if there is jsconfig.json
    // for non TS projects.
  } else if (hasJsConfig) {
    config = __non_webpack_require__(appJsConfig);
  }

  config = config || {};
  const options = config.compilerOptions || {};

  return {
    additionalModulePaths: getAdditionalModulePaths(options, paths),
    webpackAliases: getWebpackAliases(options, paths),
    // jestAliases: getJestAliases(options),
    hasTsConfig,
  };
}
