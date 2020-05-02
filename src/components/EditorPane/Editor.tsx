import React, { FunctionComponent, useEffect, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { CodeEntry } from "../../types/paint";
import { parseAST } from "../../utils/ast/ast-helpers";
import { JSXActionProvider } from "../../utils/ast/providers/JSXActionProvider";
import { setupLanguageService } from "../../utils/moncao-helpers";
import { Project } from "../../utils/Project";
import { getFileExtensionLanguage, isScriptEntry } from "../../utils/utils";

interface Props {
  project: Project;
  codeEntry: CodeEntry;
  onCodeChange: (codeId: string, newCode: string) => void;
  selectedElementId: string | undefined;
  onSelectElement: (lookupId: string) => void;
  isActiveEditor: boolean;
}

export const Editor: FunctionComponent<Props> = ({
  project,
  codeEntry,
  onCodeChange,
  selectedElementId,
  onSelectElement,
  isActiveEditor,
}) => {
  const editorRef = useRef<MonacoEditor>(null);

  useEffect(() => {
    if (isActiveEditor) {
      editorRef.current?.editor?.layout();
    }
  }, [isActiveEditor]);

  // highlight the selected element in the editor
  const activeHighlights = useRef<string[]>([]);
  const activeActions = useRef<string[]>([]);
  useEffect(() => {
    let decorations: monaco.editor.IModelDeltaDecoration[] = [];
    if (
      selectedElementId &&
      project.primaryElementEditor.getCodeIdFromLookupId(selectedElementId) ===
        codeEntry.id
    ) {
      try {
        const ast = parseAST(codeEntry.code);
        decorations = project.primaryElementEditor.getEditorDecorationsForElement(
          ast,
          // todo sync code in entry?
          codeEntry,
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
      console.log("refreshing monaco decorations", codeEntry.id);
      activeHighlights.current =
        editorRef.current?.editor?.deltaDecorations(
          oldDecorations,
          decorations
        ) || [];
    }

    // add in editor actions
    editorRef.current?.editor?.changeViewZones((changeAccessor) => {
      activeActions.current.forEach((viewZoneId) =>
        changeAccessor.removeZone(viewZoneId)
      );
      activeActions.current = [];
      if (!isScriptEntry(codeEntry)) return;

      try {
        const actions = new JSXActionProvider().getEditorActions(codeEntry);

        actions.forEach((action) => {
          const linkNode = document.createElement("a");
          linkNode.className =
            "absolute z-20 cursor-pointer opacity-75 text-xs hover:opacity-100 hover:underline";
          linkNode.style.marginLeft = `${action.column * 7.7}px`;
          linkNode.text = "Move style to style sheet";
          linkNode.onclick = () => {
            const changes = new JSXActionProvider().runEditorActionOnAST(
              action,
              project
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
  }, [codeEntry, selectedElementId]);

  // try to select the element the editor cursor is at
  useEffect(() => {
    if (!isScriptEntry(codeEntry)) return undefined;

    return editorRef.current?.editor?.onDidChangeCursorPosition((e) => {
      if (!codeEntry.code || !editorRef.current?.editor?.hasTextFocus()) return;

      // try to find an element at the cursor location in the latest code ast
      let lookupId;
      try {
        const ast = parseAST(codeEntry.code);
        lookupId = project.primaryElementEditor.getElementLookupIdAtCodePosition(
          ast,
          // todo sync code in entry?
          codeEntry,
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
  }, [codeEntry, selectedElementId]);

  return (
    <MonacoEditor
      ref={editorRef}
      language={getFileExtensionLanguage(codeEntry)}
      theme="darkVsPlus"
      value={codeEntry.code}
      options={{
        automaticLayout: true,
      }}
      onChange={(newCode) => onCodeChange(codeEntry.id, newCode)}
      editorDidMount={(editorMonaco) =>
        setupLanguageService(editorMonaco, codeEntry)
      }
    />
  );
};
