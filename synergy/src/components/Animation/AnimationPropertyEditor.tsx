import React, { FunctionComponent } from "react";
import { faArrowRight, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  BoundColorPicker,
  CSSLengthInput,
  TextInput,
  useAutocomplete,
} from "../../hooks/useInput";
import { IconButton } from "../IconButton";
import {
  AnimationProperty,
  AnimationPropertyInputType,
  isEntranceAnimationProperty,
} from "./types";
import { motionProperties } from "./utils";

const renderAnimationPropertyInput = (
  inputType: AnimationPropertyInputType | undefined,
  value: string,
  onChange: (value: string) => void
) => {
  switch (inputType) {
    case AnimationPropertyInputType.CSS_LENGTH:
      return (
        <CSSLengthInput
          initialValue={value}
          bindInitialValue
          onChange={(value) => onChange(value)}
        />
      );
    case AnimationPropertyInputType.COLOR:
      return (
        <BoundColorPicker
          initialValue={value}
          onChange={(value, preview) => !preview && onChange(value)}
        />
      );
    case AnimationPropertyInputType.STRING:
    case AnimationPropertyInputType.NUMBER:
    default:
      return (
        <TextInput
          initialValue={value}
          bindInitialValue
          onChange={(value) => {
            if (inputType === AnimationPropertyInputType.NUMBER)
              value = `${parseFloat(value)}`;
            onChange(value);
          }}
        />
      );
  }
};

interface Props {
  property: AnimationProperty;
  onChange: (newProperty: AnimationProperty) => void;
  onDelete: () => void;
}

export const AnimationPropertyEditor: FunctionComponent<Props> = ({
  property,
  onChange,
  onDelete,
}) => {
  const propertySettings = motionProperties[property.name];

  const [, renderPropertyNameInput] = useAutocomplete({
    initialValue: property.name,
    freeSolo: true,
    options: Object.entries(motionProperties).map(([key, value]) => ({
      name: value!.name,
      value: key,
    })),
    onChange(value) {
      const newProperty = { ...property, name: value };
      if (isEntranceAnimationProperty(newProperty)) {
        newProperty.initial = "";
        delete newProperty.value;
      } else {
        newProperty.value = "";
      }
      onChange(newProperty);
    },
  });

  return (
    <div className="flex items-center">
      {renderPropertyNameInput({ fullWidth: false, style: { minWidth: 105 } })}
      {isEntranceAnimationProperty(property) ? (
        <div>
          {renderAnimationPropertyInput(
            propertySettings?.inputType,
            isEntranceAnimationProperty(property) ? property.initial : "",
            (initial) => onChange({ ...property, initial })
          )}
        </div>
      ) : (
        <div />
      )}
      <FontAwesomeIcon icon={faArrowRight} className="mx-2" />
      <div>
        {renderAnimationPropertyInput(
          propertySettings?.inputType,
          property.value || "",
          (value) => onChange({ ...property, value })
        )}
      </div>
      <IconButton
        className="ml-2"
        title={"Delete"}
        icon={faTimes}
        onClick={onDelete}
      />
    </div>
  );
};
