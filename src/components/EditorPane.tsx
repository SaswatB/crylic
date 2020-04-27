import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { CodeEntry } from "../types/paint";
import { parseAST } from "../utils/ast/ast-helpers";
import { JSXASTEditor } from "../utils/ast/editors/JSXASTEditor";
import { JSXActionProvider } from "../utils/ast/providers/JSXActionProvider";
import { setupLanguageService } from "../utils/moncao-helpers";
import { getFileExtensionLanguage, getFriendlyName } from "../utils/utils";
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
  const activeCodeEntry = codeEntries[activeTab];
  const activeCodeId = codeEntries[activeTab]?.id;
  const activeCode = codeEntries[activeTab]?.code;

  const editorRef = useRef<MonacoEditor>(null);

  // highlight the selected element in the editor
  const activeHighlights = useRef<string[]>([]);
  const activeActions = useRef<string[]>([]);
  useEffect(() => {
    let decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (
      selectedElementId &&
      new JSXASTEditor().getCodeIdFromLookupId(selectedElementId) ===
        activeCodeId
    ) {
      try {
        const ast = parseAST(activeCode);
        decorations = new JSXASTEditor().getEditorDecorationsForElement(
          ast,
          // todo sync code in entry?
          activeCodeEntry!,
          selectedElementId
        );
      } catch (err) {
        console.log(err);
      }

      if (decorations.length > 0) {
        // center to the first decoration if the editor doesn't currently have focus
        if (!editorRef.current?.editor?.hasTextFocus()) {
          editorRef.current?.editor?.revealPositionInCenter({
            lineNumber: decorations[0].range.startLineNumber,
            column: decorations[0].range.startColumn,
          });
        }
      }
    }

    // update the highlight decorations on the editor
    const oldDecorations = activeHighlights.current;
    if (oldDecorations.length !== 0 || decorations.length !== 0) {
      console.log("refreshing monaco decorations", activeCodeId);
      activeHighlights.current =
        editorRef.current?.editor?.deltaDecorations(
          oldDecorations,
          decorations
        ) || [];
    }

    editorRef.current?.editor?.changeViewZones((changeAccessor) => {
      activeActions.current.forEach((viewZoneId) =>
        changeAccessor.removeZone(viewZoneId)
      );
      activeActions.current = [];

      try {
        const actions = new JSXActionProvider().getEditorActions({
          ...activeCodeEntry!,
          code: activeCode,
        });

        actions.forEach((action) => {
          const linkNode = document.createElement("a");
          linkNode.className =
            "absolute z-20 cursor-pointer opacity-75 text-xs hover:opacity-100 hover:underline";
          linkNode.style.marginLeft = `${action.column * 7.7}px`;
          linkNode.text = "Move style to style sheet";
          linkNode.onclick = () => {
            const changes = new JSXActionProvider().runEditorActionOnAST(
              action,
              codeEntries.map((codeEntry) => {
                if (codeEntry.id === activeCodeId) {
                  return { ...codeEntry, code: activeCode };
                }
                return codeEntry;
              })
            );
            changes.forEach(({ id, code }) => onCodeChange(id, code));
          };
          const domNode = document.createElement("div");
          domNode.appendChild(linkNode);

          const viewZoneId = changeAccessor.addZone({
            afterLineNumber: action.line - 1,
            heightInLines: 1,
            domNode: domNode,
          });
          activeActions.current.push(viewZoneId);
        });
      } catch (err) {
        console.log(err);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCode, activeCodeEntry, activeCodeId, selectedElementId]);

  // try to select the element the editor cursor is at
  useEffect(() => {
    return editorRef.current?.editor?.onDidChangeCursorPosition((e) => {
      if (!editorRef.current?.editor?.hasTextFocus()) return;

      // try to find an element at the cursor location in the latest code ast
      let lookupId;
      try {
        const ast = parseAST(activeCode);
        lookupId = new JSXASTEditor().getElementLookupIdAtCodePosition(
          ast,
          // todo sync code in entry?
          activeCodeEntry!,
          e.position.lineNumber,
          e.position.column
        );
      } catch (err) {
        console.log(err);
      }
      if (lookupId === undefined) return;

      // if the selection is different than what's already selected, select the element
      if (!selectedElementId || lookupId !== selectedElementId) {
        onSelectElement(lookupId);
      }
    }).dispose;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCodeId, activeCode, selectedElementId]);

  // switch to the editor that the selected element belongs to when it's selected
  useEffect(() => {
    if (selectedElementId) {
      const codeId = new JSXASTEditor().getCodeIdFromLookupId(
        selectedElementId
      );
      const codeIndex = codeEntries.findIndex((entry) => entry.id === codeId);
      if (codeIndex !== -1 && codeIndex !== activeTab) {
        setActiveTab(codeIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId]);

  return (
    <Tabs
      className="editor-tabs"
      activeTab={activeTab}
      onChange={setActiveTab}
      tabs={codeEntries.map((codeEntry, index) => ({
        name: getFriendlyName(codeEntries, index),
        render: () => (
          <MonacoEditor
            ref={editorRef}
            language={getFileExtensionLanguage(codeEntry)}
            theme="darkVsPlus"
            width="600px"
            value={codeEntry.code}
            options={{
              automaticLayout: true,
            }}
            onChange={(newCode) => onCodeChange(codeEntry.id, newCode)}
            editorDidMount={(editorMonaco) =>
              setupLanguageService(editorMonaco, codeEntry)
            }
          />
        ),
      }))}
    />
  );
};
