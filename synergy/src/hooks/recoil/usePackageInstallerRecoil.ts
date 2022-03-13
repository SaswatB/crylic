import { MutableRefObject, useCallback } from "react";
import { atom, useRecoilState } from "recoil";
import { Subject } from "rxjs";

import { useProject } from "../../services/ProjectService";
import { PackageInstaller } from "../../types/paint";
import { useUpdatingRef } from "../useUpdatingRef";

const installingPackagesState = atom<boolean>({
  key: "installingPackages",
  default: false,
});

const installPackagesOutputState = atom<MutableRefObject<Subject<Buffer>>>({
  key: "installPackagesOutput",
  default: { current: new Subject<Buffer>() },
});

export function usePackageInstallerRecoil() {
  const project = useProject({ allowUndefined: true });
  const projectRef = useUpdatingRef(project);
  const [installingPackages, setInstallingPackages] = useRecoilState(
    installingPackagesState
  );
  const installingPackagesRef = useUpdatingRef(installingPackages);
  // todo handle input?
  const [installPackagesOutputRef] = useRecoilState(installPackagesOutputState);

  const installPackages: PackageInstaller = useCallback(
    (packageName, devDep) => {
      if (!projectRef.current || installingPackagesRef.current) return;
      setInstallingPackages(true);
      const childProcess = projectRef.current.config
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
        projectRef.current?.refreshConfig();
      });
    },
    [
      installPackagesOutputRef,
      installingPackagesRef,
      projectRef,
      setInstallingPackages,
    ]
  );

  return {
    installPackages,
    installingPackages,
    installPackagesOutput: installPackagesOutputRef.current,
  };
}
