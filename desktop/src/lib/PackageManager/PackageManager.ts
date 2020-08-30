import { ChildProcess } from "child_process";

export abstract class PackageManager {
  public constructor(protected path: string) {}

  public abstract installPackage(
    packageName: string,
    devDep?: boolean
  ): ChildProcess;
}
