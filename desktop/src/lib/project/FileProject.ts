import { MakeDirectoryOptions } from "fs";
import minimatch from "minimatch";
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
import { PortablePath } from "synergy/src/lib/project/PortablePath";
import { Project } from "synergy/src/lib/project/Project";
import { ProjectConfig } from "synergy/src/lib/project/ProjectConfig";
import { sleep } from "synergy/src/lib/utils";
import { PluginService } from "synergy/src/services/PluginService";

import { streamToString } from "../../utils/utils";
import { FileTyperUtilsRunner } from "../typer/FileTyperUtilsRunner";
import { FileProjectConfig } from "./FileProjectConfig";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const fsP = fs.promises;
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
    folderPath: PortablePath,
    template: FileProjectTemplate,
    pluginService: PluginService
  ) {
    console.log(folderPath);
    if (
      !(await fsP
        .access(folderPath.getNativePath())
        .then(() => true)
        .catch(() => false))
    )
      await fsP.mkdir(folderPath.getNativePath(), { recursive: true });

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
            const dest = folderPath.join(entry.fileName);

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
            const destDir = isDir ? dest : dest.getDirname();

            const mkdirOptions: MakeDirectoryOptions = { recursive: true };
            if (isDir) {
              mkdirOptions.mode = procMode;
            }
            await fsP.mkdir(destDir.getNativePath(), mkdirOptions);
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
              await fsP.symlink(
                await streamToString(readStream),
                dest.getNativePath()
              );
            } else {
              readStream.pipe(
                fs.createWriteStream(dest.getNativePath(), { mode: procMode })
              );
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

    track("project.create", { template });
    // sleep to flush changes and avoid blank loading bug
    await sleep(1000);

    return FileProject.createProjectFromDirectory(folderPath, pluginService);
  }

  public static async createProjectFromDirectory(
    folderPath: PortablePath,
    pluginService: PluginService
  ) {
    // build metadata
    const refreshConfig = () => {
      const newConfig: ProjectConfig =
        FileProjectConfig.createProjectConfigFromDirectory(folderPath);
      pluginService.activatePlugins(newConfig);
      return pluginService.reduceActive(
        (acc, p) => p.overrideProjectConfig(acc, { fs }),
        newConfig
      );
    };
    const config: ProjectConfig = refreshConfig();
    const project = new FileProject(folderPath, config, refreshConfig);

    // process all the source files
    const fileCodeEntries: CodeEntry[] = [];
    // recursive function for creating code entries from a folder
    const read = async (subFolderPath: PortablePath) =>
      Promise.all(
        (await fsP.readdir(subFolderPath.getNativePath())).map(async (file) => {
          const filePath = subFolderPath.join(file);
          // skip ignored paths
          if (
            config
              .getIgnoredPaths()
              .find((g) =>
                minimatch(
                  filePath
                    .getNormalizedPath()
                    .replace(folderPath.getNormalizedPath(), ""),
                  g
                )
              )
          ) {
            console.log("ignoring file due to config", filePath);
            return;
          }
          if ((await fsP.stat(filePath.getNativePath())).isDirectory()) {
            // recurse through the directory's children
            await read(filePath);
          } else if (
            file.match(SCRIPT_EXTENSION_REGEX) ||
            file.match(STYLE_EXTENSION_REGEX)
          ) {
            // add scripts/styles as code entries
            const code = await fsP.readFile(filePath.getNativePath(), {
              encoding: "utf-8",
            });
            fileCodeEntries.push(new CodeEntry(project, filePath, code));
          } else if (file.match(IMAGE_EXTENSION_REGEX)) {
            // add images as code entries without text code
            fileCodeEntries.push(new CodeEntry(project, filePath, undefined));
          } else {
            console.log("ignoring file due to extension", filePath);
          }
        })
      );
    // read all files within the folder
    await read(folderPath);

    // set the window name
    document.title = `${config.name} - Crylic`;

    project.addCodeEntries(fileCodeEntries);
    project.getTyperUtils(); // load typer utils after all code entries are loaded
    return project;
  }

  private fileWatcher: import("chokidar").FSWatcher;
  private fileChangeQueue = new Set<string>();
  private fileChangeQueueTimer: number | undefined;

  protected constructor(
    path: PortablePath,
    config: ProjectConfig,
    private refreshConfigImpl: () => ProjectConfig
  ) {
    super(path, config);

    // watch for changes on files in the source folder
    this.fileWatcher = chokidar
      .watch(path.getNativePath(), {
        ignored: (p) =>
          !!config
            .getIgnoredPaths()
            .find((g) =>
              minimatch(
                normalizePath(p.replace(path.getNativePath(), ""), "/"),
                g
              )
            ),
      })
      .on("change", (changePath) => {
        this.fileChangeQueue.add(changePath);
        clearTimeout(this.fileChangeQueueTimer);
        this.fileChangeQueueTimer = setTimeout(
          () => this.processFileChangeQueue(),
          1000
        ) as unknown as number;
      });
  }

  public override onClose() {
    super.onClose();
    void this.fileWatcher.close();
    clearTimeout(this.fileChangeQueueTimer);
    this.fileTyperUtilsRunner?.dispose();
  }

  private savedCodeRevisions: Record<
    string /* codeEntry.id */,
    { id: number; code?: string }
  > = {};
  private isCodeEntrySaved(codeEntry: CodeEntry) {
    return (
      codeEntry.codeRevisionId === INITIAL_CODE_REVISION_ID ||
      codeEntry.codeRevisionId === this.savedCodeRevisions[codeEntry.id]?.id
    );
  }

  public saveFiles() {
    this.codeEntries$
      .getValue()
      .filter(
        (e) => e.code$.getValue() !== undefined && !this.isCodeEntrySaved(e)
      )
      .forEach((e) => this.saveFile(e));
    this.projectSaved$.next();
    track("project.saved");
  }
  public saveFile({ id, filePath, code$, codeRevisionId }: CodeEntry) {
    fs.mkdirSync(filePath.getDirname().getNativePath(), { recursive: true });
    const code = code$.getValue();
    fs.writeFileSync(filePath.getNativePath(), code || "");
    this.savedCodeRevisions[id] = { id: codeRevisionId, code };
  }

  private async processFileChangeQueue() {
    this.fileChangeQueueTimer = undefined;
    const filePaths = Array.from(this.fileChangeQueue);
    this.fileChangeQueue.clear();
    const codeEntries = this.codeEntries$.getValue();

    const fileSyncSuccessPaths: string[] = [];
    const fileSyncConflictPaths: string[] = [];
    for (const filePath of filePaths) {
      const codeEntry = codeEntries.find(
        (entry) => entry.filePath.getNativePath() === filePath
      );
      if (!codeEntry) continue; // skip files that aren't tracked
      const code = codeEntry.code$.getValue();
      if (code === undefined) continue; // skip files without code
      const newCode = fs.readFileSync(filePath, { encoding: "utf-8" });
      if (newCode === code) continue; // skip unchanged files

      if (!this.isCodeEntrySaved(codeEntry)) {
        if (newCode === this.savedCodeRevisions[codeEntry.id]?.code) continue; // skip files that match the last save

        // in this case we have a file that was changed on disk and within Crylic, but Crylic did not save it
        // which is a conflict
        fileSyncConflictPaths.push(filePath);
        console.error(
          "file changed in memory and on disk (conflict)",
          filePath
        );
        continue;
      }

      // last case, update the in-memory file
      codeEntry.updateCode(newCode);
      this.savedCodeRevisions[codeEntry.id] = {
        id: codeEntry.codeRevisionId,
        code: newCode,
      };
      fileSyncSuccessPaths.push(filePath);
      console.info("file changed on disk and updated in-memory", filePath);
    }
    if (fileSyncSuccessPaths.length) {
      bus.publish(fileSyncSuccess({ paths: fileSyncSuccessPaths }));
      track("project.fileSyncSuccess", { count: fileSyncSuccessPaths.length });
    }
    if (fileSyncConflictPaths.length) {
      bus.publish(fileSyncConflict({ paths: fileSyncConflictPaths }));
      track("project.fileSyncConflict", {
        count: fileSyncConflictPaths.length,
      });
    }
  }

  public refreshConfig() {
    this.config$.next(this.refreshConfigImpl());
  }

  private fileTyperUtilsRunner: FileTyperUtilsRunner | undefined;
  public getTyperUtils() {
    if (!this.fileTyperUtilsRunner)
      this.fileTyperUtilsRunner = new FileTyperUtilsRunner(
        this.path,
        this.codeEntries$
      );
    return this.fileTyperUtilsRunner.getProxy();
  }

  public addAsset(source: PortablePath) {
    const getAssetPath = (name: string) =>
      this.path.join(`${this.config.getDefaultNewAssetFolder()}/${name}`);
    const fileName = source.getBasename();
    const assetPath = { path: getAssetPath(fileName) };
    let counter = 1;
    while (
      this.codeEntries$
        .getValue()
        .find((entry) => entry.filePath.isEqual(assetPath.path))
    ) {
      assetPath.path = getAssetPath(fileName.replace(/\./, `-${counter++}.`));
    }
    fs.writeFileSync(
      assetPath.path.getNativePath(),
      fs.readFileSync(source.getNativePath(), { encoding: null }),
      { encoding: null }
    );
    this.addCodeEntries([new CodeEntry(this, assetPath.path, undefined)]);
  }
}
