interface PackageInstallJob {
  stdout?: {
    on(event: "data", callback: (chunk: Buffer) => void): void;
  } | null;
  stderr?: {
    on(event: "data", callback: (chunk: Buffer) => void): void;
  } | null;
  on(event: "exit", callback: () => void): void;
}

export abstract class PackageManager {
  public constructor(protected path: string) {}

  public abstract installPackage(
    packageName: string | undefined,
    devDep?: boolean
  ): PackageInstallJob;

  public abstract hasDepsInstalled(): boolean;
}
