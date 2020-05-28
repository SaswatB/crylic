import deepFreeze from "deep-freeze-strict";
import { fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { MakeDirectoryOptions } from "fs";
import produce, { immerable } from "immer";
import { camelCase, cloneDeep, uniqueId, upperFirst } from "lodash";
import { Readable } from "stream";
import yauzl from "yauzl";

import { CodeEntry, ProjectConfig, RenderEntry } from "../types/paint";
import {
  getComponentExport,
  hashString,
  parseCodeEntryAST,
  printCodeEntryAST,
} from "./ast/ast-helpers";
import { ElementASTEditor, StyleASTEditor } from "./ast/editors/ASTEditor";
import { JSXASTEditor } from "./ast/editors/JSXASTEditor";
import { StyledASTEditor } from "./ast/editors/StyledASTEditor";
import { StyleSheetASTEditor } from "./ast/editors/StyleSheetASTEditor";
import { CONFIG_FILE_NAME, DEFAULT_PROJECT_SOURCE_FOLDER } from "./constants";
import {
  getFriendlyName,
  IMAGE_EXTENSION_REGEX,
  isImageEntry,
  isScriptEntry,
  isStyleEntry,
  SCRIPT_EXTENSION_REGEX,
  streamToString,
  STYLE_EXTENSION_REGEX,
} from "./utils";

import projectTemplate from "!!../../loaders/binaryLoader!../assets/project-template.zip";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const path = __non_webpack_require__("path") as typeof import("path");

type EditorEntry<T> = {
  shouldApply: (entry: CodeEntry) => boolean;
  editor: T;
};

export class Project {
  private [immerable] = true; // enable immer support

  public readonly codeEntries: CodeEntry[] = [];
  public readonly renderEntries: RenderEntry[] = [];
  public readonly elementEditorEntries: EditorEntry<ElementASTEditor<any>>[];
  public readonly styleEditorEntries: EditorEntry<StyleASTEditor<any>>[];

  private constructor(
    public readonly path: string,
    public readonly sourceFolderName: string,
    public readonly config?: ProjectConfig
  ) {
    this.elementEditorEntries = [
      { editor: new JSXASTEditor(), shouldApply: isScriptEntry },
    ];
    this.styleEditorEntries = [
      { editor: new StyledASTEditor(), shouldApply: isScriptEntry },
      { editor: new StyleSheetASTEditor(), shouldApply: isStyleEntry },
    ];
  }

  public static async createNewProjectInDirectory(folderPath: string) {
    console.log(folderPath);
    if (!fs.existsSync) fs.mkdirSync(folderPath, { recursive: true });

    let canceled = false;
    await new Promise((resolve, reject) => {
      yauzl.fromBuffer(projectTemplate, {}, (err, zipFile) => {
        if (err || !zipFile) throw new Error("Failed to read project template");

        zipFile.on("error", (err) => {
          canceled = true;
          reject(err);
        });

        let readCount = 0;
        zipFile.on("entry", async (entry) => {
          if (canceled) return;
          console.log("zip entry", entry);

          try {
            const dest = path.join(folderPath, entry.fileName);

            // convert external file attr int into a fs stat mode int
            const mode = (entry.externalFileAttributes >> 16) & 0xffff;
            // check if it's a symlink or dir (using stat mode constants)
            const IFMT = 61440;
            const IFDIR = 16384;
            const IFLNK = 40960;
            const symlink = (mode & IFMT) === IFLNK;
            let isDir = (mode & IFMT) === IFDIR;

            // Failsafe, borrowed from jsZip
            if (!isDir && entry.fileName.endsWith("/")) {
              isDir = true;
            }

            // check for windows weird way of specifying a directory
            // https://github.com/maxogden/extract-zip/issues/13#issuecomment-154494566
            const madeBy = entry.versionMadeBy >> 8;
            if (!isDir)
              isDir = madeBy === 0 && entry.externalFileAttributes === 16;

            // reverse umask first (~)
            const umask = ~process.umask();
            // & with processes umask to override invalid perms
            const procMode = (mode || (isDir ? 0o755 : 0o644)) & umask;

            // always ensure folders are created
            const destDir = isDir ? dest : path.dirname(dest);

            const mkdirOptions: MakeDirectoryOptions = { recursive: true };
            if (isDir) {
              mkdirOptions.mode = procMode;
            }
            fs.mkdirSync(destDir, mkdirOptions);
            if (isDir) return;

            const readStream = await new Promise<Readable>(
              (subResolve, subReject) =>
                zipFile.openReadStream(entry, (subErr, stream) => {
                  if (subErr || !stream)
                    subReject(new Error("Failed to read zip entry"));
                  else subResolve(stream);
                })
            );

            if (symlink) {
              fs.symlinkSync(await streamToString(readStream), dest);
            } else {
              readStream.pipe(fs.createWriteStream(dest, { mode: procMode }));
            }

            if (++readCount === zipFile.entryCount) {
              resolve();
            }
          } catch (err) {
            canceled = true;
            reject(err);
          }
        });
      });
    });

    return Project.createProjectFromDirectory(folderPath);
  }

  public static async createProjectFromDirectory(folderPath: string) {
    let config;
    const fileCodeEntries: {
      filePath: string;
      code: string | undefined;
    }[] = [];

    const configFilePath = path.join(folderPath, CONFIG_FILE_NAME);
    if (fs.existsSync(configFilePath)) {
      // todo use a more secure require/allow async
      config = pipe(
        configFilePath,
        // require the config file
        __non_webpack_require__ as (p: string) => any,
        // parse the config file
        ProjectConfig.decode,
        fold(
          // log any errors
          (e) => {
            console.log(e);
            return undefined;
          },
          (config) => config
        )
      );
    }
    const srcFolderName = config?.sourceFolder || DEFAULT_PROJECT_SOURCE_FOLDER;
    const srcFolderPath = path.join(folderPath, srcFolderName);
    if (fs.existsSync(srcFolderPath)) {
      // recursive function for creating code entries from a folder
      const read = (subFolderPath: string) =>
        fs.readdirSync(subFolderPath).forEach((file) => {
          const filePath = path.join(subFolderPath, file);
          if (fs.statSync(filePath).isDirectory()) {
            // recurse through the directory's children
            read(filePath);
          } else if (
            file.match(SCRIPT_EXTENSION_REGEX) ||
            file.match(STYLE_EXTENSION_REGEX)
          ) {
            // add scripts/styles as code entries
            fileCodeEntries.push({
              filePath,
              code: fs.readFileSync(filePath, { encoding: "utf-8" }),
            });
          } else if (file.match(IMAGE_EXTENSION_REGEX)) {
            // add images as code entries without text code
            fileCodeEntries.push({
              filePath,
              code: undefined,
            });
          }
        });
      // read all files within the source folder
      read(srcFolderPath);
    }

    return new Project(folderPath, srcFolderName, config).addCodeEntries(
      ...fileCodeEntries
    );
  }

  public saveFiles() {
    this.codeEntries
      .filter(({ code }) => code !== undefined)
      .forEach(({ filePath, code }) => fs.writeFileSync(filePath, code));
  }

  public get editorEntries() {
    return [...this.elementEditorEntries, ...this.styleEditorEntries];
  }

  public get primaryElementEditor() {
    return this.elementEditorEntries[0].editor;
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

  public addCodeEntries(
    ...partialEntries: (Partial<CodeEntry> & { filePath: string })[]
  ) {
    return produce(this, (draft: Project) => {
      partialEntries.forEach((partialEntry) =>
        draft.codeEntries.push(this.createCodeEntry(partialEntry))
      );
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

  private createCodeEntry(
    partialEntry: Partial<CodeEntry> & { filePath: string }
  ) {
    const codeEntry = {
      id: hashString(partialEntry.filePath),
      code: undefined,
      edit: false,
      render: false,
      ...partialEntry,
    };
    return {
      ...codeEntry,
      ...this.getCodeEntryMetaData(codeEntry),
    };
  }

  private getCodeEntryMetaData(codeEntry: CodeEntry) {
    if (!isScriptEntry(codeEntry) && !isStyleEntry(codeEntry)) {
      return { isRenderable: false, isEditable: isImageEntry(codeEntry) };
    }

    try {
      // parse ast data
      let ast = parseCodeEntryAST(codeEntry);

      const isBootstrap =
        this.config?.bootstrap &&
        path.join(this.path, this.config.bootstrap) === codeEntry.filePath;
      // check if the file is a component
      const isRenderableScript =
        isScriptEntry(codeEntry) &&
        !isBootstrap &&
        // todo add an option to disable this check (component files must start with an uppercase letter)
        !!codeEntry.filePath.match(/(^|\\|\/)[A-Z][^/\\]*$/) &&
        // todo add an option to disable this check (test and declaration files are ignored)
        !codeEntry.filePath.match(/\.(test|d)\.[jt]sx?$/);

      let isRenderable = false;
      let exportName = undefined;
      let exportIsDefault = undefined;
      if (isRenderableScript) {
        const componentExport = getComponentExport(ast as any);
        if (componentExport) {
          isRenderable = true;
          exportName =
            componentExport.name ||
            upperFirst(
              camelCase(
                path
                  .basename(codeEntry.filePath)
                  .replace(SCRIPT_EXTENSION_REGEX, "")
              )
            );
          exportIsDefault = componentExport.isDefault;
        }
      }

      // add lookup data from each editor to the ast
      this.getEditorsForCodeEntry(codeEntry).forEach((editor) => {
        ({ ast } = editor.addLookupData({ ast, codeEntry }));
      });
      // return the modified ast and code
      console.log("codeTransformer", codeEntry.filePath, ast);
      return {
        ast: deepFreeze(cloneDeep(ast)),
        codeWithLookupData: printCodeEntryAST(codeEntry, ast),
        isRenderable,
        // this code entry has to be a script or style entry by this point so it's editable
        isEditable: true,
        exportName,
        exportIsDefault,
      };
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  public addAsset(filePath: string) {
    return produce(this, (draft: Project) => {
      const fileName = path.basename(filePath);
      const assetPath = { path: this.getNewAssetPath(fileName) };
      let counter = 1;
      while (
        this.codeEntries.find((entry) => entry.filePath === assetPath.path)
      ) {
        assetPath.path = this.getNewAssetPath(
          fileName.replace(/\./, `-${counter++}.`)
        );
      }
      fs.writeFileSync(
        assetPath.path,
        fs.readFileSync(filePath, { encoding: null }),
        { encoding: null }
      );
      draft.codeEntries.push(
        this.createCodeEntry({ filePath: assetPath.path })
      );
    });
  }

  public addRenderEntry(codeEntry: CodeEntry) {
    return produce(this, (draft: Project) => {
      let baseName = getFriendlyName(this, codeEntry.id);
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
    });
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
