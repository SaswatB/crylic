import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { CodeEntry } from "../types/paint";
import {
  createLookupId,
  getCodeIdFromLookupId,
  getElementIndexFromLookupId,
  parseAST,
} from "../utils/ast-helpers";
import {
  getJSXASTByLookupIndex,
  getJSXElementForSourceCodePosition,
} from "../utils/ast-parsers";
import { Tabs } from "./Tabs";

interface Props {
  codeEntries: CodeEntry[];
  onCodeChange: (codeId: string, newCode: string) => void;
  selectedElementId: string | undefined;
  onSelectElement: (lookupId: string) => void;
}

export const EditorPane: FunctionComponent<Props> = ({
  codeEntries,
  onCodeChange,
  selectedElementId,
  onSelectElement,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const activeCodeId = codeEntries[activeTab]?.id;
  const activeCode = codeEntries[activeTab]?.code;

  const editorRef = useRef<MonacoEditor>(null);

  // highlight the selected element in the editor
  const activeHighlights = useRef<Record<string, string[] | undefined>>({}); // code id -> decoration map
  useEffect(() => {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (
      selectedElementId &&
      getCodeIdFromLookupId(selectedElementId) === activeCodeId
    ) {
      // try to find the jsx element in the latest ast
      let path;
      try {
        path = getJSXASTByLookupIndex(
          parseAST(activeCode),
          getElementIndexFromLookupId(selectedElementId)
        );
      } catch (err) {}

      // get the start tag location
      const { start: openStart, end: openEnd } =
        path?.value?.openingElement?.name?.loc || {};
      if (openStart && openEnd) {
        decorations.push({
          range: new monaco.Range(
            openStart.line,
            openStart.column + 1,
            openEnd.line,
            openEnd.column + 1
          ),
          options: { inlineClassName: "selected-element-code-highlight" },
        });
        // center to the open tag if the editor doesn't currently have focus
        if (!editorRef.current?.editor?.hasTextFocus()) {
          editorRef.current?.editor?.revealPositionInCenter({
            lineNumber: openStart.line,
            column: openStart.column + 1,
          });
        }
      }
      // get the end tag location (may not be available for self-closing tags)
      const { start: closeStart, end: closeEnd } =
        path?.value?.closingElement?.name?.loc || {};
      if (closeStart && closeEnd) {
        decorations.push({
          range: new monaco.Range(
            closeStart.line,
            closeStart.column + 1,
            closeEnd.line,
            closeEnd.column + 1
          ),
          options: { inlineClassName: "selected-element-code-highlight" },
        });
      }
    }
    // update the highlight decorations on the editor
    const oldDecorations = activeHighlights.current[activeCodeId] || [];
    if (oldDecorations.length !== 0 || decorations.length !== 0) {
      console.log("refreshing monaco decorations", activeCodeId);
      activeHighlights.current[activeCodeId] =
        editorRef.current?.editor?.deltaDecorations(
          oldDecorations,
          decorations
        ) || [];
    }
  }, [activeCode, activeCodeId, selectedElementId]);

  // try to select the element the editor cursor is at
  useEffect(() => {
    return editorRef.current?.editor?.onDidChangeCursorPosition((e) => {
      if (!editorRef.current?.editor?.hasTextFocus()) return;

      // try to find a jsx element at the cursor location in the latest code ast
      let lookupIndex;
      try {
        ({ lookupIndex } = getJSXElementForSourceCodePosition(
          parseAST(activeCode),
          e.position.lineNumber,
          e.position.column
        ));
      } catch (err) {}
      if (lookupIndex === undefined) return;

      // if the selection is different than what's already selected, select the element
      const lookupId = createLookupId(activeCodeId, lookupIndex);
      if (!selectedElementId || lookupId !== selectedElementId) {
        onSelectElement(lookupId);
      }
    }).dispose;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCodeId, activeCode, selectedElementId]);

  // switch to the editor that the selected element belongs to when it's selected
  useEffect(() => {
    if (selectedElementId) {
      const codeId = getCodeIdFromLookupId(selectedElementId);
      const codeIndex = codeEntries.findIndex((entry) => entry.id === codeId);
      if (codeIndex !== -1 && codeIndex !== activeTab) {
        setActiveTab(codeIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  return (
    <Tabs
      activeTab={activeTab}
      onChange={setActiveTab}
      tabs={codeEntries.map((entry) => ({
        name: entry.filePath.replace(/^.*(\/|\\)/, ""),
        render: () => (
          <MonacoEditor
            ref={editorRef}
            language="javascript"
            theme="vs-dark"
            width="600px"
            value={entry.code}
            onChange={(newCode) => onCodeChange(entry.id, newCode)}
          />
        ),
      }))}
    />
  );
};
