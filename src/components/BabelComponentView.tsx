import React, {
  useState,
  useEffect,
  useRef,
  FunctionComponent,
  useImperativeHandle,
  forwardRef,
  RefAttributes,
} from "react";
import * as Babel from "@babel/standalone";
import vm from "vm";
import { ErrorBoundary } from "./ErrorBoundary";
import { Frame } from "./Frame";
import { DIV_LOOKUP_DATA_ATTR } from "../utils/constants";

const module = __non_webpack_require__("module") as typeof import("module");
const fs = __non_webpack_require__("fs") as typeof import("fs");

const BABEL_PRESETS = ["es2015", "react", "typescript"];
const BABEL_PLUGINS = ["proposal-class-properties"];

// todo clear cache button
let cache: Record<string, Record<string, unknown> | undefined> = {};

const runCode = (requirePath: string | undefined, code: string) => {
  const startTime = new Date().getTime();
  console.log("loading...", requirePath);
  const moduleRequire = requirePath
    ? module.createRequire(requirePath)
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

        if ((requirePath || "") in cache && name in cache[requirePath || ""]!) {
          return cache[requirePath || ""]![name];
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
        const codeExports = runCode(
          subRequirePath,
          Babel.transform(
            fs.readFileSync(subRequirePath, { encoding: "utf-8" }),
            { filename: subRequirePath , presets: BABEL_PRESETS, plugins: BABEL_PLUGINS }
          ).code!
        );
        cache[requirePath || ""] = cache[requirePath || ""] || {};
        cache[requirePath || ""]![name] = codeExports;
        return codeExports;
      },
    });
  } catch (error) {
    console.log("error file", requirePath, error);
    throw error;
  }
  const endTime = new Date().getTime();
  console.log("loaded", requirePath, endTime - startTime);
  return moduleExports.exports || exports;
};

export const getComponentElementFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  componentView: BabelComponentViewRef | null
) => {
  const boundingBox = (event.target as HTMLDivElement).getBoundingClientRect();
  const x = event.clientX - boundingBox.x;
  const y = event.clientY - boundingBox.y;
  return componentView?.getElementAtPoint(x, y);
};

export interface BabelComponentViewRef {
  getElementAtPoint: (x: number, y: number) => Element | null | undefined;
  getElementByLookupId: (lookupId: string) => Element | null | undefined;
}

export const BabelComponentView: FunctionComponent<
  {
    code: string;
    filePath?: string;
    onCompiled?: () => void;
  } & React.IframeHTMLAttributes<HTMLIFrameElement> &
    RefAttributes<BabelComponentViewRef>
> = forwardRef(({ code, filePath, onCompiled, ...props }, ref) => {
  const errorBoundary = useRef<ErrorBoundary>(null);
  const [CompiledElement, setCompiledElement] = useState<any>();
  useEffect(() => {
    if (onCompiled) {
      // wait until the dom is fully updated so that getElementByLookupId can work with the updated view
      setTimeout(() => requestAnimationFrame(() => onCompiled()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [CompiledElement]);

  useEffect(() => {
    if (code) {
      try {
        const result = Babel.transform(code, { filename: filePath || 'untitled', presets: BABEL_PRESETS, plugins: BABEL_PLUGINS });
        if (result.code !== undefined && result.code !== null) {
          console.log("compiled!");
          const codeExports = runCode(filePath, result.code);
          setCompiledElement(() =>
            Object.values(codeExports).find(
              (e): e is Function => typeof e === "function"
            )
          );

          if (errorBoundary.current?.hasError()) {
            errorBoundary.current.resetError();
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
  }, [filePath, code]);

  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({
    getElementAtPoint(x, y) {
      return frame.current?.contentDocument?.elementFromPoint(x, y);
    },
    getElementByLookupId(lookupId) {
      return frame.current?.contentDocument?.querySelector(
        `[data-${DIV_LOOKUP_DATA_ATTR}="${lookupId}"]`
      );
    },
  }));

  return (
    <Frame {...props} ref={frame}>
      <ErrorBoundary
        ref={errorBoundary}
        onError={(error, errorInfo) => {
          console.log(error, errorInfo);
        }}
      >
        {CompiledElement && <CompiledElement />}
      </ErrorBoundary>
    </Frame>
  );
});
