import { atom, useRecoilState } from "recoil";

import { Project } from "../../../lib/project/Project";

const projectState = atom<Project | undefined>({
  key: "project",
  default: undefined,
  dangerouslyAllowMutability: true,
});

export function useProjectRecoil() {
  const [project, setProject] = useRecoilState(projectState);
  (window as any).project = project; // only for debugging purposes

  const resetProject = (newProject?: Project) => {
    setProject(newProject);
    newProject?.clearChangeHistory();
  };

  return {
    project,
    setProject,
    initProject: (p: Project) => resetProject(p),
    closeProject: () => resetProject(),
  };
}
