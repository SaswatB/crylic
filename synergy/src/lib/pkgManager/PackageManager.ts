import { PortablePath } from "../project/PortablePath";

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
  public constructor(protected path: PortablePath) {}

  public abstract installPackage(
    packageName: string | undefined,
    devDep?: boolean
  ): PackageInstallJob;

  public abstract hasDepsInstalled(): boolean;
}
