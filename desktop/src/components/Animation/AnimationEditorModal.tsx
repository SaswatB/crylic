import React, { useEffect, useState } from "react";
import { faPlus, faSync } from "@fortawesome/free-solid-svg-icons";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import { motion } from "framer-motion";
import produce from "immer";
import { capitalize } from "lodash";

import { IconButton } from "synergy/src/components/IconButton";

import { useSelectInput } from "../../hooks/useInput";
import { SelectedElement, UpdateSelectedElement } from "../../types/paint";
import { createModal } from "../PromiseModal";
import { AnimationPropertyEditor } from "./AnimationPropertyEditor";
import {
  AnimationPropertyMap,
  AnimationType,
  isEntranceAnimationProperty,
} from "./types";
import {
  animationPropertyMapToProps,
  propsToAnimationPropertyMap,
} from "./utils";

interface Props {
  selectedElement: SelectedElement;
  updateSelectedElement: UpdateSelectedElement;
}

export const AnimationEditorModal = createModal<Props, void>(
  ({ selectedElement, updateSelectedElement, resolve }) => {
    const [animationProperties, setAnimationProperties] = useState<
      AnimationPropertyMap
    >({});
    useEffect(() => {
      // convert the selected element's props to a map of animation properties per animation type
      setAnimationProperties(
        propsToAnimationPropertyMap(
          selectedElement.sourceMetadata?.directProps || {}
        )
      );
    }, [selectedElement]);
    const onSave = () => {
      // save the animation properties in the selected element's attributes
      updateSelectedElement((editor, editContext) =>
        editor.updateElementAttributes(
          editContext,
          animationPropertyMapToProps(animationProperties)
        )
      );
      resolve();
    };

    const [selectedAnimationTypeRaw, renderSelectAnimation] = useSelectInput({
      label: "Animation Type",
      initialValue: AnimationType.ENTRANCE,
      options: Object.values(AnimationType).map((t) => ({
        name: capitalize(t),
        value: t,
      })),
    });
    const selectedAnimationType = selectedAnimationTypeRaw as AnimationType;
    const [previewKey, setPreviewKey] = useState(0);
    const refreshPreview = () => setPreviewKey((p) => p + 1);
    useEffect(() => {
      if (selectedAnimationType === AnimationType.ENTRANCE) {
        refreshPreview();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      animationProperties.entrance
        ?.filter((p) => !!p.name)
        .map(
          (p) =>
            `${p.name}-${p.value}-${
              isEntranceAnimationProperty(p) ? p.initial : ""
            }`
        )
        .join("-"),
    ]);

    const renderEditor = () => (
      <div className="flex flex-col overflow-y-auto p-2" style={{ width: 500 }}>
        {renderSelectAnimation({ style: { marginBottom: 15 } })}

        {animationProperties[selectedAnimationType]?.map((prop, i) => (
          <AnimationPropertyEditor
            key={i}
            property={prop}
            onChange={(newProp) =>
              setAnimationProperties(
                produce((draft) => {
                  draft[selectedAnimationType]![i] = newProp;
                })
              )
            }
            onDelete={() =>
              setAnimationProperties(
                produce((draft) => {
                  draft[selectedAnimationType]!.splice(i, 1);
                })
              )
            }
          />
        ))}

        <IconButton
          className="ml-2"
          title={"Add Property"}
          icon={faPlus}
          onClick={() =>
            setAnimationProperties(
              produce((draft) => {
                (draft[selectedAnimationType] =
                  draft[selectedAnimationType] || []).push(
                  selectedAnimationType === AnimationType.ENTRANCE
                    ? { name: "", initial: "" }
                    : { name: "", value: "" }
                );
              })
            )
          }
        />
      </div>
    );

    const renderPreview = () => (
      <div
        className="flex flex-1 relative overflow-hidden items-center justify-center bg-gray-300"
        style={{ minWidth: 300, minHeight: 300 }}
      >
        {/* todo error boundary */}
        {selectedAnimationType === AnimationType.ENTRANCE && (
          <div className="absolute top-0 right-0 m-4">
            <IconButton
              title={"Refresh"}
              icon={faSync}
              onClick={refreshPreview}
            />
          </div>
        )}
        <motion.div
          key={`${previewKey}`}
          className="w-16 h-16 bg-gray-800 rounded-lg"
          {...animationPropertyMapToProps(animationProperties)}
        />
      </div>
    );

    return (
      <Dialog open={true} onClose={() => resolve()} maxWidth="xl">
        <DialogContent>
          <div className="flex">
            {renderEditor()}
            <div className="flex flex-col pl-4">
              {renderPreview()}
              {/* <div style={{ height: 100 }}></div> */}
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resolve()}>Cancel</Button>
          <Button onClick={() => onSave()} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);
