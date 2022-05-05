export abstract class PortablePath {
  public abstract isEqual(path: PortablePath): boolean;

  public abstract join(path: string): PortablePath;
  public abstract relative(path: PortablePath | string): PortablePath;

  public abstract getDirname(): PortablePath;
  public abstract getBasename(): string;

  public abstract getNativePath(): string;
  public abstract getNormalizedPath(): string;
}
