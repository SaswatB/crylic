import React from "react";
import { useSnackbar } from "notistack";

import { AnimationEditorModal } from "../../../components/Animation/AnimationEditorModal";
import { usePackageInstallerRecoil } from "../../../hooks/recoil/usePackageInstallerRecoil";
import { useProject } from "../../../services/ProjectService";
import { ComponentDefinitionType } from "../../../types/paint";
import { ltTakeNext, sleep } from "../../utils";
import { ElementEditorFieldProps } from "../ElementEditor";

export function AnimationFE({
  selectedElement,
  onChangeComponent,
}: ElementEditorFieldProps) {
  const project = useProject();
  const { installPackages } = usePackageInstallerRecoil();
  const { enqueueSnackbar } = useSnackbar();

  if (!project.config.isPackageInstalled("framer-motion")) {
    return (
      <>
        <div className="text-center">Framer Motion is not installed</div>
        <button
          className="btn mt-2 w-full"
          onClick={() => installPackages("framer-motion@4.1.17")}
        >
          Install
        </button>
      </>
    );
  }
  const { componentName } = selectedElement.sourceMetadata || {};
  if (componentName && !componentName.startsWith("motion.")) {
    // todo support more elements for animation conversion
    if (["div", "a", "button", "span"].includes(componentName)) {
      const enableAnimation = async () => {
        const codeId = project.primaryElementEditor.getCodeIdFromLookupId(
          selectedElement.lookupId
        );
        if (!codeId) return;
        const codeEntry = project?.getCodeEntryValue(codeId);
        if (!codeEntry) return;

        const newCodePromise = ltTakeNext(codeEntry.code$);

        await onChangeComponent({
          type: ComponentDefinitionType.ImportedElement,
          display: { name: componentName },
          component: {
            import: {
              path: "framer-motion",
              namespace: "motion",
              name: componentName,
            },
            name: componentName,
          },
        });
        // todo find a better way to refresh, or avoid errors when doing this operation, than a timed refresh
        await newCodePromise;
        await sleep(1000);
        project.refreshRenderEntries();

        enqueueSnackbar("Animation enabled on element!");
      };
      return (
        <button className="btn w-full" onClick={enableAnimation}>
          Enable Animation
        </button>
      );
    }
    // todo use a better method of checking whether motion is being used on the element
    return <>Animation is not enabled for element</>;
  }
  return (
    <button className="btn w-full" onClick={() => AnimationEditorModal({})}>
      Edit Animation
    </button>
  );
}
