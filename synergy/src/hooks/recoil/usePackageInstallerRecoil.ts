import { MutableRefObject } from "react";
import { atom, useRecoilState } from "recoil";
import { Subject } from "rxjs";

import { useProject } from "../../services/ProjectService";
import { PackageInstaller } from "../../types/paint";

const installingPackagesState = atom<boolean>({
  key: "installingPackages",
  default: false,
});

const installPackagesOutputState = atom<MutableRefObject<Subject<Buffer>>>({
  key: "installPackagesOutput",
  default: { current: new Subject<Buffer>() },
});

export function usePackageInstallerRecoil() {
  const project = useProject();
  const [installingPackages, setInstallingPackages] = useRecoilState(
    installingPackagesState
  );
  // todo handle input?
  const [installPackagesOutputRef] = useRecoilState(installPackagesOutputState);
  const installPackages: PackageInstaller = (packageName, devDep) => {
    if (!project) return;
    setInstallingPackages(true);
    const childProcess = project.config
      .getPackageManager()
      .installPackage(packageName, devDep);
    childProcess.stdout?.on("data", (chunk) =>
      installPackagesOutputRef.current.next(chunk)
    );
    childProcess.stderr?.on("data", (chunk) =>
      installPackagesOutputRef.current.next(chunk)
    );
    childProcess.on("exit", () => {
      setInstallingPackages(false);
      project?.refreshConfig();
    });
  };

  return {
    installPackages,
    installingPackages,
    installPackagesOutput: installPackagesOutputRef.current,
  };
}
