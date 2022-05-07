import { normalizePath } from "synergy/src/lib/normalizePath";
import { PortablePath } from "synergy/src/lib/project/PortablePath";

const pathModule = __non_webpack_require__("path") as typeof import("path");

export class FilePortablePath extends PortablePath {
  public constructor(protected nativePath: string) {
    super();
  }

  public override isEqual(path: PortablePath): boolean {
    if (!(path instanceof FilePortablePath))
      throw new Error("Unsupported PortablePath type");
    return this.nativePath === path.nativePath;
  }

  public override join(path: string): PortablePath {
    return new FilePortablePath(
      pathModule.join(this.nativePath, normalizePath(path, pathModule.sep))
    );
  }
  public override relative(to: PortablePath): PortablePath {
    if (!(to instanceof FilePortablePath))
      throw new Error("Unsupported PortablePath type");
    return new FilePortablePath(
      pathModule.relative(this.nativePath, to.nativePath)
    );
  }

  public override getDirname(): PortablePath {
    return new FilePortablePath(pathModule.dirname(this.nativePath));
  }
  public override getBasename(): string {
    return pathModule.basename(this.nativePath);
  }

  public override getNativePath(): string {
    return this.nativePath;
  }
  public override getNormalizedPath(): string {
    return normalizePath(this.nativePath, "/");
  }
}
