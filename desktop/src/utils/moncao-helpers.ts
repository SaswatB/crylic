import { wireTmGrammars } from "monaco-editor-textmate";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Registry } from "monaco-textmate";

import { CodeEntry } from "../types/paint";
import darkVs from "../vendor/dark-vs.json";
import { getFileExtensionLanguage } from "./utils";

import TypeScriptReactTMLanguage from "!!raw-loader!../vendor/TypeScriptReact.tmLanguage";
import reactTypes from "!!raw-loader!@types/react/index.d.ts";

// setup a better typescript grammar for jsx syntax highlighting
const registry = new Registry({
  getGrammarDefinition: async (scopeName) => {
    return {
      format: "plist",
      content: TypeScriptReactTMLanguage,
    };
  },
});
const grammars = new Map();
grammars.set("typescript", "source.tsx");
grammars.set("javascript", "source.tsx");

// add a theme that works with the textmate token names
monaco.editor.defineTheme(
  "darkVsPlus",
  darkVs as monaco.editor.IStandaloneThemeData
);

const modelCache: Record<string, monaco.editor.ITextModel | undefined> = {};

export function setupLanguageService(
  editorMonaco: monaco.editor.IStandaloneCodeEditor,
  codeEntry: CodeEntry
) {
  const language = getFileExtensionLanguage(codeEntry);
  // setup typescript autocomplete
  if (language === "typescript") {
    const fileUrl = monaco.Uri.parse(
      `file://${codeEntry.filePath
        .replace(":", "")
        .replace(/\\/g, "/")
        .replace(/\.jsx?$/, ".tsx")}`
    );
    const model =
      modelCache[fileUrl.toString()] ||
      monaco.editor.createModel(codeEntry.code || "", language, fileUrl);
    modelCache[fileUrl.toString()] = model;
    editorMonaco.setModel(null);
    editorMonaco.setModel(model);
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      codeEntry.code || "",
      fileUrl.toString()
    );
    // add react types
    const MONACO_LIB_PREFIX = "file:///node_modules/";
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      reactTypes,
      `${MONACO_LIB_PREFIX}react/index.d.ts`
    );
    // add jsx support
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.React,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
    });
    // apply the better typescript grammar when the worker loads
    monaco.languages.typescript
      .getTypeScriptWorker()
      .then(() => wireTmGrammars(monaco, registry, grammars));
  }
}
