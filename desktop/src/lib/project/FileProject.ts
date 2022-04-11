import { MakeDirectoryOptions } from "fs";
import { Readable } from "stream";
import yauzl from "yauzl";

import { track } from "synergy/src/hooks/useTracking";
import { bus, fileSyncConflict, fileSyncSuccess } from "synergy/src/lib/events";
import {
  IMAGE_EXTENSION_REGEX,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "synergy/src/lib/ext-regex";
import { normalizePath } from "synergy/src/lib/normalizePath";
import {
  CodeEntry,
  INITIAL_CODE_REVISION_ID,
} from "synergy/src/lib/project/CodeEntry";
import { Project } from "synergy/src/lib/project/Project";
import { sleep } from "synergy/src/lib/utils";

import { streamToString } from "../../utils/utils";
import { FileProjectConfig } from "./FileProjectConfig";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const path = __non_webpack_require__("path") as typeof import("path");
const chokidar = __non_webpack_require__(
  "chokidar"
) as typeof import("chokidar");

export enum FileProjectTemplate {
  Blank = "blank",
}

const TemplateBuffers: Record<FileProjectTemplate, () => Promise<Buffer>> = {
  [FileProjectTemplate.Blank]: () =>
    import(
      "!!../../../loaders/binaryLoader!../../assets/project-blank-template.zip"
    ).then((b) => b.default),
};

export class FileProject extends Project {
  public static async createNewProjectInDirectory(
    folderPath: string,
    template: FileProjectTemplate
  ) {
    console.log(folderPath);
    if (!fs.existsSync(folderPath))
      fs.mkdirSync(folderPath, { recursive: true });

    const buffer = await TemplateBuffers[template]();

    let canceled = false;
    await new Promise<void>((resolve, reject) => {
      yauzl.fromBuffer(buffer, {}, (err, zipFile) => {
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

            // check for window's weird way of specifying a directory
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

    track('project.create', { template })
    // sleep to flush changes and avoid blank loading bug
    await sleep(1000);

    return FileProject.createProjectFromDirectory(folderPath);
  }

  public static async createProjectFromDirectory(folderPath: string) {
    // build metadata
    const config = FileProjectConfig.createProjectConfigFromDirectory(
      folderPath
    );
    const srcFolderPath = config.getFullSourceFolderPath();
    const project = new FileProject(folderPath, srcFolderPath, config);

    // process all the source files
    const fileCodeEntries: CodeEntry[] = [];
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
            const code = fs.readFileSync(filePath, { encoding: "utf-8" });
            fileCodeEntries.push(new CodeEntry(project, filePath, code));
          } else if (file.match(IMAGE_EXTENSION_REGEX)) {
            // add images as code entries without text code
            fileCodeEntries.push(new CodeEntry(project, filePath, undefined));
          } else {
            console.log("ignoring file", filePath);
          }
        });
      // read all files within the source folder
      read(srcFolderPath);
    }

    // set the window name
    document.title = `${config.name} - Crylic`;

    project.addCodeEntries(fileCodeEntries);
    return project;
  }

  private fileWatcher: import("chokidar").FSWatcher
  private fileChangeQueue = new Set<string>()
  private fileChangeQueueTimer: number | undefined

  protected constructor(
    path: string,
    sourceFolderPath: string,
    config: FileProjectConfig
  ) {
    super(path, sourceFolderPath, config);

    // watch for changes on files in the source folder
    this.fileWatcher = chokidar.watch(sourceFolderPath).on("change", (path) => {
      this.fileChangeQueue.add(path);
      clearTimeout(this.fileChangeQueueTimer)
      this.fileChangeQueueTimer = setTimeout(() => this.processFileChangeQueue(), 1000)
    });
  }

  public override onClose() {
    super.onClose()
    void this.fileWatcher.close();
    clearTimeout(this.fileChangeQueueTimer)
  }

  private savedCodeRevisions: Record<string /* codeEntry.id */, { id:number, code?: string }> = {};
  private isCodeEntrySaved(codeEntry: CodeEntry) {
    return codeEntry.codeRevisionId === INITIAL_CODE_REVISION_ID
      || codeEntry.codeRevisionId === this.savedCodeRevisions[codeEntry.id]?.id
  }

  public saveFiles() {
    this.codeEntries$
      .getValue()
      .filter(
        (e) => e.code$.getValue() !== undefined && !this.isCodeEntrySaved(e)
      )
      .forEach((e) => this.saveFile(e));
    this.projectSaved$.next();
    track('project.saved')
  }
  public saveFile({ id, filePath, code$, codeRevisionId }: CodeEntry) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const code = code$.getValue()
    fs.writeFileSync(filePath, code);
    this.savedCodeRevisions[id] = { id: codeRevisionId, code };
  }

  private async processFileChangeQueue() {
    this.fileChangeQueueTimer = undefined
    const filePaths = Array.from(this.fileChangeQueue)
    this.fileChangeQueue.clear()
    const codeEntries = this.codeEntries$.getValue()

    const fileSyncSuccessPaths: string[] = []
    const fileSyncConflictPaths: string[] = []
    for (const filePath of filePaths) {
      const codeEntry = codeEntries.find(entry => entry.filePath === filePath)
      if (!codeEntry) continue; // skip files that aren't tracked
      const code = codeEntry.code$.getValue();
      if (code === undefined) continue; // skip files without code
      const newCode = fs.readFileSync(filePath, { encoding: "utf-8" });
      if (newCode === code) continue; // skip unchanged files

      if (!this.isCodeEntrySaved(codeEntry)) {
        if (newCode === this.savedCodeRevisions[codeEntry.id]?.code) continue; // skip files that match the last save

        // in this case we have a file that was changed on disk and within Crylic, but Crylic did not save it
        // which is a conflict
        fileSyncConflictPaths.push(filePath)
        console.error('file changed in memory and on disk (conflict)', filePath);
        continue;
      }

      // last case, update the in-memory file
      codeEntry.updateCode(newCode);
      this.savedCodeRevisions[codeEntry.id] = { id: codeEntry.codeRevisionId, code: newCode }
      fileSyncSuccessPaths.push(filePath)
      console.info('file changed on disk and updated in-memory', filePath);
    }
    if (fileSyncSuccessPaths.length) {
      bus.publish(fileSyncSuccess({ paths: fileSyncSuccessPaths }))
      track('project.fileSyncSuccess', { count: fileSyncSuccessPaths.length })
    }
    if (fileSyncConflictPaths.length) {
      bus.publish(fileSyncConflict({ paths: fileSyncConflictPaths }))
      track('project.fileSyncConflict', { count: fileSyncConflictPaths.length })
    }
  }

  public refreshConfig() {
    // todo refresh all config dependencies as well
    this.config = FileProjectConfig.createProjectConfigFromDirectory(this.path);
  }

  public addAsset(filePath: string) {
    const fileName = path.basename(filePath);
    const assetPath = { path: this.getNewAssetPath(fileName) };
    let counter = 1;
    while (
      this.codeEntries$
        .getValue()
        .find((entry) => entry.filePath === assetPath.path)
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
    this.addCodeEntries([new CodeEntry(this, assetPath.path, undefined)]);
  }

  // #region new paths

  public getNormalizedPath(p: string) {
    return normalizePath(p, path.sep);
  }

  public getNormalizedSourcePath(srcPath: string) {
    return path.join(this.sourceFolderPath, this.getNormalizedPath(srcPath));
  }

  public getNewStyleSheetPath(name: string) {
    return this.getNormalizedSourcePath(`styles/${name}.css`);
  }

  public getNewAssetPath(fileName: string) {
    return this.getNormalizedSourcePath(`assets/${fileName}`);
  }

  // #endregion
}
