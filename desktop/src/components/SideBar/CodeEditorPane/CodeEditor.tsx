import React, { FunctionComponent, useEffect, useRef } from "react";
import MonacoEditor from "react-monaco-editor";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import { useBoundState } from "synergy/src/hooks/useBoundState";
import { useBusSubscription } from "synergy/src/hooks/useBusSubscription";
import { useDebounce } from "synergy/src/hooks/useDebounce";
import { useObservable } from "synergy/src/hooks/useObservable";
import { useUpdatingRef } from "synergy/src/hooks/useUpdatingRef";
import { JSXActionProvider } from "synergy/src/lib/ast/providers/JSXActionProvider";
import { editorOpenLocation, editorResize } from "synergy/src/lib/events";
import { CodeEntry } from "synergy/src/lib/project/CodeEntry";
import { Project } from "synergy/src/lib/project/Project";
import { isDefined, ltTakeNext, takeNext } from "synergy/src/lib/utils";

import { setupLanguageService } from "../../../utils/moncao-helpers";

const fs = __non_webpack_require__("fs") as typeof import("fs");

interface Props {
  project: Project;
  codeEntry: CodeEntry;
  onCodeChange: (codeId: string, newCode: string) => void;
  selectedElementId: string | undefined;
  onSelectElement: (lookupId: string) => void;
  isActiveEditor: boolean;
}

export const CodeEditor: FunctionComponent<Props> = ({
  project,
  codeEntry,
  onCodeChange,
  selectedElementId,
  onSelectElement,
  isActiveEditor,
}) => {
  const editorRef = useRef<MonacoEditor>(null);
  const code = useObservable(codeEntry.code$);
  const [localValue, setLocalValue] = useBoundState(code);
  const localValueRef = useUpdatingRef(localValue);
  const [debouncedLocalValue] = useDebounce(localValue, 1000);
  useEffect(() => {
    if (debouncedLocalValue !== code) {
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
    requestAnimationFrame(() => {
      setTimeout(async () => {
        let decorations: monaco.editor.IModelDeltaDecoration[] = [];
        if (
          selectedElementId &&
          project.primaryElementEditor.getCodeIdFromLookupId(
            selectedElementId
          ) === codeEntry.id
        ) {
          try {
            decorations = project.primaryElementEditor.getEditorDecorationsForElement(
              { ast: (await ltTakeNext(codeEntry.ast$))!, codeEntry },
              selectedElementId
            );
          } catch (err) {
            console.log(err);
          }

          if (decorations.length > 0) {
            // center to the first decoration if the editor doesn't currently have focus
            if (!editorRef.current?.editor?.hasTextFocus()) {
              editorRef.current?.editor?.revealPositionInCenter({
                lineNumber: decorations[0]!.range.startLineNumber,
                column: decorations[0]!.range.startColumn,
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
          if (!codeEntry.isScriptEntry) return;

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
                changes.forEach((c) => onCodeChange(c.id, c.code));
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
      }, 150);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeEntry, debouncedLocalValue, selectedElementId]);

  // try to select the element the editor cursor is at
  useEffect(() => {
    if (!codeEntry.isScriptEntry) return undefined;

    return editorRef.current?.editor?.onDidChangeCursorPosition(async (e) => {
      if (!code || !editorRef.current?.editor?.hasTextFocus()) return;

      // try to find an element at the cursor location in the latest code ast
      let lookupId;
      try {
        lookupId = project.primaryElementEditor.getElementLookupIdAtCodePosition(
          { ast: (await ltTakeNext(codeEntry.ast$))!, codeEntry },
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
  useBusSubscription(editorResize, () => editorRef.current?.editor?.layout());

  // listen for editor open requests
  const openHighlight = useRef<string[]>([]);
  useBusSubscription(editorOpenLocation, (payload) => {
    if (codeEntry.id === payload.codeEntry.id && isDefined(payload.line)) {
      editorRef.current?.editor?.revealLineInCenter(payload.line);
      openHighlight.current =
        editorRef.current?.editor?.deltaDecorations(openHighlight.current, [
          {
            range: new monaco.Range(payload.line, 1, payload.line, 1),
            options: {
              isWholeLine: true,
              className: "selected-style-group-code-line-highlight",
            },
          },
        ]) || [];
    }
  });

  // clear the open line highlight if the selected element changes
  useEffect(() => {
    openHighlight.current =
      editorRef.current?.editor?.deltaDecorations(openHighlight.current, []) ||
      [];
  }, [selectedElementId]);

  return (
    <MonacoEditor
      ref={editorRef}
      language={codeEntry.fileExtensionLanguage}
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
              alert(
                `There was an error while saving: ${(error as Error).message}`
              );
            }
          }
        );
      }}
    />
  );
};
