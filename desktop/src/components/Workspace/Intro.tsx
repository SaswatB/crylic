import React, { useState } from "react";
import styled from "@emotion/styled";
import { faFolder } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Backdrop, CircularProgress } from "@material-ui/core";
import { useSnackbar } from "notistack";

import { Button, ButtonGroupV } from "synergy/src/components/base/Button";
import {
  DEFAULT_BORDER_RADIUS,
  TRUNCATE,
} from "synergy/src/components/base/design-constants";
import { NewProjectModal } from "synergy/src/components/NewProjectModal";
import { Tour } from "synergy/src/components/Tour/Tour";
import { useService } from "synergy/src/hooks/useService";
import { useTracking } from "synergy/src/hooks/useTracking";
import { normalizePath } from "synergy/src/lib/normalizePath";
import { ProjectService } from "synergy/src/services/ProjectService";

import icon from "../../assets/icon.png";
import { getUserFolder, openFilePicker } from "../../hooks/useFilePicker";
import {
  FileProject,
  FileProjectTemplate,
} from "../../lib/project/FileProject";

const fs = __non_webpack_require__("fs") as typeof import("fs");
const path = __non_webpack_require__("path") as typeof import("path");

const FileProjectTemplateNames: Record<FileProjectTemplate, string> = {
  [FileProjectTemplate.Blank]: "Blank Project",
};

export function Intro() {
  const projectService = useService(ProjectService);
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(0);
  let recentProjects = projectService.getRecentProjects();

  if (__IS_CRYLIC__) {
    recentProjects = [
      { filePath: "C:\\Users\\Me\\Documents\\project1" },
      { filePath: "C:\\Users\\Me\\Documents\\project2" },
      { filePath: "C:\\Users\\Me\\Documents\\project-three" },
      {
        filePath:
          "C:\\Users\\Me\\Documents\\longer directory with spaces\\project5",
      },
      { filePath: "C:\\Users\\Me\\Documents\\project5" },
      { filePath: "C:\\Users\\Me\\Documents\\project6" },
    ];
  }

  useTracking("intro.loaded", { onMount: true });

  const createProject = async () => {
    const initialLocation =
      (await getUserFolder("documents")) || (await getUserFolder("home"));
    if (!initialLocation) return;

    const res = await NewProjectModal({
      templates: Object.values(FileProjectTemplate).map((t) => ({
        name: FileProjectTemplateNames[t],
        value: t,
      })),
      initialName: "my-crylic-project",
      initialLocation,
      onBrowse: () => openFilePicker({ properties: ["openDirectory"] }),
    });
    if (!res) return;

    setLoading((l) => l + 1);
    FileProject.createNewProjectInDirectory(
      path.join(res.location, res.name),
      res.template as FileProjectTemplate
    )
      .then((p) => projectService.setProject(p))
      .finally(() => setLoading((l) => l - 1));
  };

  const openProjectWithPath = (filePath: string) => {
    if (!fs.existsSync(filePath)) {
      enqueueSnackbar("Project does not exist", { variant: "error" });
      return;
    }

    setLoading((l) => l + 1);
    // set timeout allows react to render the loading screen before
    // the main thread get's pegged from opening the project
    setTimeout(
      () =>
        FileProject.createProjectFromDirectory(filePath)
          .then((p) => projectService.setProject(p))
          .finally(() => setLoading((l) => l - 1)),
      150
    );
  };

  const openProject = async () => {
    const filePath = await openFilePicker({ properties: ["openDirectory"] });
    if (filePath) openProjectWithPath(filePath);
  };

  return (
    <Container>
      <Backdrop open={loading > 0}>
        <CircularProgress disableShrink />
      </Backdrop>
      <Logo src={icon} alt="Crylic" />
      <ActionGroup>
        <Button block data-tour="new-project" onClick={createProject}>
          New Project
        </Button>
        <Tour
          name="new-project"
          beaconStyle={{
            marginTop: -8,
            marginLeft: 10,
          }}
        >
          Crylic is project based, so to get started you will need to either
          create a new project or open an existing one. <br />
          <br />
          Try creating a new project to start!
          <br />
          Existing React projects can also be opened, ones created with
          create-react-app work the best.
        </Tour>
        <Button block onClick={openProject}>
          Open Project
        </Button>
      </ActionGroup>
      {recentProjects.length > 0 && (
        <RecentProjects>
          Recent Projects
          <ButtonGroupV>
            {/* todo show more than 5 projects using a scrollbar */}
            {recentProjects.slice(0, 5).map(({ filePath }) => (
              <Button
                key={filePath}
                title={filePath}
                onClick={() => openProjectWithPath(filePath)}
              >
                <FontAwesomeIcon icon={faFolder} />
                <span>{path.basename(normalizePath(filePath, path.sep))}</span>
                <ButtonPath>- {filePath}</ButtonPath>
              </Button>
            ))}
          </ButtonGroupV>
        </RecentProjects>
      )}
    </Container>
  );
}

// #region styles

const Container = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  position: absolute;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

const Logo = styled.img`
  width: 60px;
  margin-bottom: 25px;
`;

const ActionGroup = styled(ButtonGroupV)`
  width: 330px;
  ${Button} {
    padding: 15px;
  }
`;

const RecentProjects = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 52px;
  padding: 22px 30px;
  border-radius: ${DEFAULT_BORDER_RADIUS};
  background-color: rgba(255, 255, 255, 0.1);
  max-width: 500px;
  color: #ffffff;

  ${ButtonGroupV} {
    margin-top: 15px;
  }
  ${Button} {
    display: flex;
    justify-content: normal;
    align-items: center;
    padding: 10px 20px;
    text-align: left;

    svg {
      margin-right: 15px;
      font-size: 20px;
    }
    span {
      white-space: nowrap;
    }
  }
`;

const ButtonPath = styled.span`
  margin-left: 5px;
  opacity: 0.5;
  ${TRUNCATE}
`;

// #endregion
