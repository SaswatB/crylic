import React from "react";
import { useSnackbar } from "notistack";

import { AnimationEditorModal } from "../../../components/Animation/AnimationEditorModal";
import { usePackageInstallerRecoil } from "../../../hooks/recoil/usePackageInstallerRecoil";
import { useProject } from "../../../services/ProjectService";
import { ComponentDefinitionType } from "../../../types/paint";
import { isSelectedElementTarget_Component } from "../../../types/selected-element";
import { ltTakeNext, sleep } from "../../utils";
import { ElementEditorFieldProps } from "../ElementEditor";
import { InputRowBlockButton } from "../InputRowWrapper";

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
        <InputRowBlockButton
          className="mt-2"
          onClick={() => installPackages("framer-motion@4.1.17")}
        >
          Install
        </InputRowBlockButton>
      </>
    );
  }
  if (!isSelectedElementTarget_Component(selectedElement)) return null;

  const { lookupId, sourceMetadata } = selectedElement.target;
  const { componentName } = sourceMetadata || {};
  if (componentName && !componentName.startsWith("motion.")) {
    // todo support more elements for animation conversion
    if (["div", "a", "button", "span"].includes(componentName)) {
      const enableAnimation = async () => {
        const codeId =
          project.primaryElementEditor.getCodeIdFromLookupId(lookupId);
        if (!codeId) return;
        const codeEntry = project?.getCodeEntryValue(codeId);
        if (!codeEntry) return;

        const newCodePromise = ltTakeNext(codeEntry.code$);

        await onChangeComponent({
          type: ComponentDefinitionType.ImportedElement,
          display: { id: componentName, name: componentName },
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
        <InputRowBlockButton onClick={enableAnimation}>
          Enable Animation
        </InputRowBlockButton>
      );
    }
    // todo use a better method of checking whether motion is being used on the element
    return <>Animation is not enabled for element</>;
  }
  return (
    <InputRowBlockButton onClick={() => AnimationEditorModal({})}>
      Edit Animation
    </InputRowBlockButton>
  );
}
