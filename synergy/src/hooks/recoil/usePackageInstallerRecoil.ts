import { MutableRefObject } from "react";
import { atom, useRecoilState } from "recoil";
import { Subject } from "rxjs";

import { PackageInstaller } from "../../types/paint";
import { useProjectRecoil } from "./useProjectRecoil/useProjectRecoil";

const installingPackagesState = atom<boolean>({
  key: "installingPackages",
  default: false,
});

const installPackagesOutputState = atom<MutableRefObject<Subject<Buffer>>>({
  key: "installPackagesOutput",
  default: { current: new Subject<Buffer>() },
});

export function usePackageInstallerRecoil() {
  const { project, setProject } = useProjectRecoil();
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
      setProject((project) => project?.refreshConfig());
    });
  };

  return {
    installPackages,
    installingPackages,
    installPackagesOutput: installPackagesOutputRef.current,
  };
}
