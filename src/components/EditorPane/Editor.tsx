import React, { FunctionComponent, useEffect, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useBus } from "ts-bus/react";

import { useBoundState } from "../../hooks/useBoundState";
import { useDebounce } from "../../hooks/useDebounce";
import { useUpdatingRef } from "../../hooks/useUpdatingRef";
import { editorResize } from "../../lib/events";
import { Project } from "../../lib/project/Project";
import { CodeEntry } from "../../types/paint";
import { JSXActionProvider } from "../../utils/ast/providers/JSXActionProvider";
import { setupLanguageService } from "../../utils/moncao-helpers";
import { getFileExtensionLanguage, isScriptEntry } from "../../utils/utils";

const fs = __non_webpack_require__("fs") as typeof import("fs");

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
  const bus = useBus();
  const editorRef = useRef<MonacoEditor>(null);
  const [localValue, setLocalValue] = useBoundState(codeEntry.code);
  const localValueRef = useUpdatingRef(localValue);
  const [debouncedLocalValue] = useDebounce(localValue, 1000);
  useEffect(() => {
    if (debouncedLocalValue !== codeEntry.code) {
      onCodeChange(codeEntry.id, debouncedLocalValue || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocalValue]);

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
        decorations = project.primaryElementEditor.getEditorDecorationsForElement(
          { ast: codeEntry.ast, codeEntry },
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
        lookupId = project.primaryElementEditor.getElementLookupIdAtCodePosition(
          { ast: codeEntry.ast, codeEntry },
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

  // listen for layout changes
  useEffect(
    () =>
      bus.subscribe(editorResize, () => editorRef.current?.editor?.layout()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <MonacoEditor
      ref={editorRef}
      language={getFileExtensionLanguage(codeEntry)}
      theme="darkVsPlus"
      value={localValue}
      options={{
        automaticLayout: true,
      }}
      onChange={setLocalValue}
      editorDidMount={(editorMonaco) => {
        try {
          setupLanguageService(editorMonaco, codeEntry);
        } catch (e) {
          console.error(e);
        }
        editorMonaco.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
          () => {
            try {
              fs.writeFileSync(codeEntry.filePath, localValueRef.current);
            } catch (error) {
              alert(`There was an error while saving: ${error.message}`);
            }
          }
        );
      }}
    />
  );
};
