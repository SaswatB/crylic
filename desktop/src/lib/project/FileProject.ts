import { MakeDirectoryOptions } from "fs";
import produce from "immer";
import path from "path";
import { Readable } from "stream";
import yauzl from "yauzl";

import { Project } from "synergy/src/lib/project/Project";
import {
  IMAGE_EXTENSION_REGEX,
  SCRIPT_EXTENSION_REGEX,
  STYLE_EXTENSION_REGEX,
} from "synergy/src/lib/utils";
import { Mutable } from "synergy/src/types/paint";

import { streamToString } from "../../utils/utils";
import { FileProjectConfig } from "./FileProjectConfig";

import projectTemplate from "!!../../../loaders/binaryLoader!../../assets/project-template.zip";

const fs = __non_webpack_require__("fs") as typeof import("fs");

export class FileProject extends Project {
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

    return FileProject.createProjectFromDirectory(folderPath);
  }

  public static async createProjectFromDirectory(folderPath: string) {
    // build metadata
    const config = FileProjectConfig.createProjectConfigFromDirectory(
      folderPath
    );

    // process all the source files
    const fileCodeEntries: {
      filePath: string;
      code: string | undefined;
    }[] = [];
    const srcFolderPath = config.getFullSourceFolderPath();
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
          } else {
            console.log("ignoring file", filePath);
          }
        });
      // read all files within the source folder
      read(srcFolderPath);
    }

    // set the window name
    document.title = `${config.name} - Crylic`;

    return new FileProject(folderPath, srcFolderPath, config).addCodeEntries(
      fileCodeEntries
    );
  }

  public saveFiles() {
    this.codeEntries
      .filter(
        ({ code, codeRevisionId }) => code !== undefined && codeRevisionId !== 1
      )
      .forEach(({ filePath, code }) => fs.writeFileSync(filePath, code));
  }

  public refreshConfig() {
    return produce(this, (draft: Mutable<Project>) => {
      draft.config = FileProjectConfig.createProjectConfigFromDirectory(
        this.path
      );
    });
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
}