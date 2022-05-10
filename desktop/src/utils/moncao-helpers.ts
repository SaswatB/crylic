import { wireTmGrammars } from "monaco-editor-textmate";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { Registry } from "monaco-textmate";

import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import darkVs from "synergy/src/vendor/dark-vs.json";

import cssTypes from "!!raw-loader!synergy/src/vendor/css-types.ts.txt";
import propTypes from "!!raw-loader!synergy/src/vendor/prop-types.ts.txt";
import reactTypes from "!!raw-loader!synergy/src/vendor/react-types.ts.txt";
import tracingTypes from "!!raw-loader!synergy/src/vendor/tracing-types.ts.txt";
import TypeScriptReactTMLanguage from "!!raw-loader!synergy/src/vendor/TypeScriptReact.tmLanguage";

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
  const language = codeEntry.fileExtensionLanguage;
  // setup typescript autocomplete
  if (language === "typescript") {
    const fileUrl = monaco.Uri.parse(
      `file://${codeEntry.filePath
        .getNormalizedPath()
        .replace(":", "")
        .replace(/\.jsx?$/, ".tsx")}`
    );
    const model =
      modelCache[fileUrl.toString()] ||
      monaco.editor.createModel(
        codeEntry.code$.getValue() || "",
        language,
        fileUrl
      );
    modelCache[fileUrl.toString()] = model;
    editorMonaco.setModel(null);
    editorMonaco.setModel(model);
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      codeEntry.code$.getValue() || "",
      fileUrl.toString()
    );
    // add react types
    const MONACO_LIB_PREFIX = "file:///node_modules";
    [
      [
        `declare module 'csstype' { ${cssTypes} }`,
        `${MONACO_LIB_PREFIX}/csstype/index.d.ts`,
      ],
      [
        `declare module 'prop-types' { ${propTypes} }`,
        `${MONACO_LIB_PREFIX}/@types/prop-types/index.d.ts`,
      ],
      [
        `declare module 'scheduler/tracing' { ${tracingTypes} }`,
        `${MONACO_LIB_PREFIX}/@types/scheduler/tracing.d.ts`,
      ],
      [
        `declare module 'react' { ${reactTypes} }`,
        `${MONACO_LIB_PREFIX}/@types/react/index.d.ts`,
      ],
    ].forEach(([code, path]) =>
      monaco.languages.typescript.typescriptDefaults.addExtraLib(code!, path)
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
