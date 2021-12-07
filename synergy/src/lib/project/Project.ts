import clone from "clone";
import deepFreeze from "deep-freeze-strict";
import produce, { immerable } from "immer";
import { camelCase, uniqueId, upperFirst } from "lodash";
import path from "path";

import { CodeEntry, EditEntry, RenderEntry } from "../../types/paint";
import {
  getComponentExport,
  hashString,
  parseCodeEntryAST,
  printCodeEntryAST,
} from "../ast/ast-helpers";
import { ElementASTEditor, StyleASTEditor } from "../ast/editors/ASTEditor";
import { JSXASTEditor } from "../ast/editors/JSXASTEditor";
import { StyledASTEditor } from "../ast/editors/StyledASTEditor";
import { StyleSheetASTEditor } from "../ast/editors/StyleSheetASTEditor";
import {
  getFriendlyName,
  isImageEntry,
  isScriptEntry,
  isStyleEntry,
  SCRIPT_EXTENSION_REGEX,
} from "../utils";
import { ProjectConfig } from "./ProjectConfig";

type EditorEntry<T> = {
  shouldApply: (entry: CodeEntry) => boolean;
  editor: T;
};

export abstract class Project {
  private [immerable] = true; // enable immer support

  public readonly codeEntries: CodeEntry[] = [];
  public readonly editEntries: EditEntry[] = [];
  public readonly renderEntries: RenderEntry[] = [];
  public readonly elementEditorEntries: EditorEntry<ElementASTEditor<any>>[];
  public readonly styleEditorEntries: EditorEntry<StyleASTEditor<any>>[];

  protected constructor(
    public readonly path: string,
    public readonly sourceFolderPath: string,
    public readonly config: ProjectConfig
  ) {
    this.elementEditorEntries = [
      { editor: new JSXASTEditor(), shouldApply: isScriptEntry },
    ];
    this.styleEditorEntries = [
      { editor: new StyledASTEditor(), shouldApply: isScriptEntry },
      { editor: new StyleSheetASTEditor(), shouldApply: isStyleEntry },
    ];
  }

  public abstract saveFiles(): void;
  public abstract addAsset(filePath: string): Project;

  public get editorEntries() {
    return [...this.elementEditorEntries, ...this.styleEditorEntries];
  }

  public get primaryElementEditor() {
    return this.elementEditorEntries[0]!.editor;
  }

  public getEditorsForCodeEntry(codeEntry: CodeEntry) {
    return this.editorEntries
      .filter(({ shouldApply }) => shouldApply(codeEntry))
      .map(({ editor }) => editor);
  }

  public getCodeEntry(codeId: string) {
    return this.codeEntries.find(({ id }) => id === codeId);
  }

  public getNewComponentPath(name: string) {
    return path.join(this.path, `src/components/${name}.tsx`);
  }

  public getNewStyleSheetPath(name: string) {
    return path.join(this.path, `src/styles/${name}.css`);
  }

  public getNewAssetPath(fileName: string) {
    return path.join(this.path, `src/assets/${fileName}`);
  }

  // Project is immutable so these functions return a new copy with modifications

  public abstract refreshConfig(): Project;

  public addCodeEntries(
    partialEntries: (Partial<CodeEntry> & { filePath: string })[],
    options?: { render?: boolean; edit?: boolean }
  ) {
    return produce(this, (draft: Project) => {
      const newCodeEntries = partialEntries.map((partialEntry) =>
        this.createCodeEntry(partialEntry)
      );
      draft.codeEntries.push(...newCodeEntries);

      // if these code entries are edited/rendered by default, add those respective entries
      if (options?.edit || options?.render) {
        newCodeEntries.forEach((newCodeEntry) => {
          if (options.edit) this.addEditEntryToDraft(draft, newCodeEntry);
          if (options.render) this.addRenderEntryToDraft(draft, newCodeEntry);
        });
      }
    });
  }

  public editCodeEntry(codeId: string, updates: Partial<CodeEntry>) {
    return produce(this, (draft: Project) => {
      const codeEntry = draft?.codeEntries.find(({ id }) => id === codeId);
      if (!codeEntry) return;

      Object.entries(updates).forEach(([key, value]) => {
        // @ts-ignore ignore assignment
        codeEntry[key] = value;

        // recalculate metadata on code change
        if (key === "code") {
          const {
            ast,
            codeWithLookupData,
            isRenderable,
            isEditable,
            exportName,
            exportIsDefault,
          } = this.getCodeEntryMetaData(codeEntry);

          codeEntry.codeRevisionId = codeEntry.codeRevisionId + 1;
          codeEntry.ast = ast;
          codeEntry.codeWithLookupData = codeWithLookupData;
          codeEntry.isRenderable = isRenderable;
          codeEntry.isEditable = isEditable;
          codeEntry.exportName = exportName;
          codeEntry.exportIsDefault = exportIsDefault;
        }
      });
    });
  }

  protected createCodeEntry(
    partialEntry: Partial<CodeEntry> & { filePath: string }
  ): CodeEntry {
    const codeEntry: CodeEntry = {
      id: hashString(partialEntry.filePath),
      code: undefined,
      codeRevisionId: 1,
      ...partialEntry,
    };
    return {
      ...codeEntry,
      ...this.getCodeEntryMetaData(codeEntry),
    };
  }

  protected getCodeEntryMetaData(codeEntry: CodeEntry) {
    if (!isScriptEntry(codeEntry) && !isStyleEntry(codeEntry)) {
      return { isRenderable: false, isEditable: isImageEntry(codeEntry) };
    }

    try {
      // parse ast data
      let ast = parseCodeEntryAST(codeEntry);

      const isBootstrap =
        !!this.config?.configFile?.bootstrap &&
        path
          .join(this.path, this.config.configFile.bootstrap)
          .replace(/\\/g, "/") === codeEntry.filePath.replace(/\\/g, "/");
      // check if the file is a component
      const isRenderableScript =
        // todo add an option to support other types of scripts
        isScriptEntry(codeEntry) &&
        // by default component files must start with an uppercase letter
        (this.config.configFile?.analyzer?.allowLowerCaseComponentFiles ||
          !!codeEntry.filePath.match(/(^|\\|\/)[A-Z][^/\\]*$/)) &&
        // by default test and declaration files are ignored)
        (this.config.configFile?.analyzer?.allowTestComponentFiles ||
          !codeEntry.filePath.match(/\.test\.[jt]sx?$/)) &&
        (this.config.configFile?.analyzer?.allowDeclarationComponentFiles ||
          !codeEntry.filePath.match(/\.d\.ts$/));

      let isRenderable = false;
      let exportName = undefined;
      let exportIsDefault = undefined;
      if (isRenderableScript || isBootstrap) {
        const componentExport = getComponentExport(ast as any);
        const baseComponentName = upperFirst(
          camelCase(
            path
              .basename(codeEntry.filePath)
              .replace(SCRIPT_EXTENSION_REGEX, "")
          )
        );
        if (componentExport) {
          isRenderable = !isBootstrap;
          exportName = componentExport.name || baseComponentName;
          exportIsDefault =
            this.config.configFile?.analyzer?.forceUseComponentDefaultExports ||
            componentExport.isDefault;
        } else if (
          this.config.configFile?.analyzer?.disableComponentExportsGuard
        ) {
          // since static analysis failed but we still need allow this file as a component guess that it's a default export
          isRenderable = !isBootstrap;
          exportName = baseComponentName;
          exportIsDefault = true;
        }
      }

      // add lookup data from each editor to the ast
      this.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
        ({ ast } = editor.addLookupData({ ast, codeEntry }));
      });
      // return the modified ast and code
      console.log("codeTransformer", codeEntry.filePath);
      return {
        ast: deepFreeze(clone(ast, undefined, undefined, undefined, true)),
        codeWithLookupData: printCodeEntryAST(codeEntry, ast),
        isRenderable,
        // this code entry has to be a script or style entry by this point so it's editable
        isEditable: true,
        isBootstrap,
        exportName,
        exportIsDefault,
      };
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  private addEditEntryToDraft(draft: Project, codeEntry: CodeEntry) {
    draft.editEntries.push({
      codeId: codeEntry.id,
    });
  }
  public addEditEntry(codeEntry: CodeEntry) {
    return produce(this, (draft: Project) =>
      this.addEditEntryToDraft(draft, codeEntry)
    );
  }

  public removeEditEntry(codeEntry: CodeEntry) {
    return produce(this, (draft: Project) => {
      draft.editEntries.splice(
        draft.editEntries.findIndex((entry) => entry.codeId === codeEntry.id),
        1
      );
    });
  }

  private addRenderEntryToDraft(draft: Project, codeEntry: CodeEntry) {
    let baseName = getFriendlyName(draft, codeEntry.id);
    const name = { current: baseName };
    let index = 1;
    while (
      draft.renderEntries.find(
        (renderEntry) => renderEntry.name === name.current
      )
    ) {
      name.current = `${baseName} (${index++})`;
    }

    draft.renderEntries.push({
      id: uniqueId(),
      name: name.current,
      codeId: codeEntry.id,
    });
  }
  public addRenderEntry(codeEntry: CodeEntry) {
    return produce(this, (draft: Project) =>
      this.addRenderEntryToDraft(draft, codeEntry)
    );
  }

  public editRenderEntry(
    renderId: string,
    partialRenderEntry: Partial<Omit<RenderEntry, "id" | "codeId">>
  ) {
    return produce(this, (draft: Project) => {
      const renderEntry = draft.renderEntries.find(
        (entry) => entry.id === renderId
      );
      Object.entries(partialRenderEntry).forEach(([key, value]) => {
        // @ts-ignore ignore type error
        renderEntry[key] = value;
      });
    });
  }

  public removeRenderEntry(renderId: string) {
    return produce(this, (draft: Project) => {
      draft.renderEntries.splice(
        draft.renderEntries.findIndex((entry) => entry.id === renderId),
        1
      );
    });
  }
}
