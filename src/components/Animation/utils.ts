import { isDefined } from "../../utils/utils";
import {
  AnimationPropertyInputType,
  AnimationPropertyMap,
  AnimationType,
  isEntranceAnimationProperty,
} from "./types";

export const motionProperties: Record<
  string,
  { name: string; inputType: AnimationPropertyInputType } | undefined
> = {
  x: { name: "x", inputType: AnimationPropertyInputType.CSS_LENGTH },
  y: { name: "y", inputType: AnimationPropertyInputType.CSS_LENGTH },
  z: { name: "z", inputType: AnimationPropertyInputType.CSS_LENGTH },
  scale: { name: "scale", inputType: AnimationPropertyInputType.NUMBER },
  scaleX: { name: "scale x", inputType: AnimationPropertyInputType.NUMBER },
  scaleY: { name: "scale y", inputType: AnimationPropertyInputType.NUMBER },
  width: { name: "width", inputType: AnimationPropertyInputType.CSS_LENGTH },
  height: { name: "height", inputType: AnimationPropertyInputType.CSS_LENGTH },
  opacity: { name: "opacity", inputType: AnimationPropertyInputType.NUMBER },
  backgroundColor: {
    name: "fill",
    inputType: AnimationPropertyInputType.COLOR,
  },
};

export const animationPropertyMapToProps = (
  animationProperties: AnimationPropertyMap
): Record<string, unknown> => {
  const newAnimationProps: any = {};
  Object.entries(animationProperties).forEach(([type, props]) => {
    let key = "animate";
    switch (type) {
      case AnimationType.ENTRANCE:
        key = "animate";
        break;
      case AnimationType.HOVER:
        key = "whileHover";
        break;
      case AnimationType.TAP:
        key = "whileTap";
        break;
    }
    props?.forEach((prop) => {
      const propertySettings = motionProperties[prop.name];
      const parsePropertyValue = (value: string) => {
        if (propertySettings?.inputType === AnimationPropertyInputType.NUMBER) {
          return parseFloat(value);
        }
        return value;
      };

      if (isEntranceAnimationProperty(prop) && prop.initial !== "") {
        newAnimationProps.initial = newAnimationProps.initial || {};
        newAnimationProps.initial[prop.name] = parsePropertyValue(prop.initial);
      }
      if (isDefined(prop.value) && prop.value !== "") {
        newAnimationProps[key] = newAnimationProps[key] || {};
        newAnimationProps[key][prop.name] = parsePropertyValue(prop.value);
      }
    });
  });
  return newAnimationProps;
};

export const propsToAnimationPropertyMap = (props: Record<string, unknown>) => {
  const newAnimationProperties: AnimationPropertyMap = {};
  Object.entries(props.initial as object).forEach(([key, value]) => {
    newAnimationProperties.entrance = newAnimationProperties.entrance || [];
    newAnimationProperties.entrance?.push({
      name: key,
      initial: `${value}`,
    });
  });
  Object.entries(props.animate as object).forEach(([key, value]) => {
    newAnimationProperties.entrance = newAnimationProperties.entrance || [];
    const existingProp = newAnimationProperties.entrance.find(
      (e) => e.name === key
    );
    if (existingProp) {
      existingProp.value = `${value}`;
    } else {
      newAnimationProperties.entrance?.push({
        name: key,
        initial: "",
        value: `${value}`,
      });
    }
  });

  Object.entries(props.whileHover as object).forEach(([key, value]) => {
    newAnimationProperties.hover = newAnimationProperties.hover || [];
    newAnimationProperties.hover?.push({ name: key, value: `${value}` });
  });
  Object.entries(props.whileTap as object).forEach(([key, value]) => {
    newAnimationProperties.tap = newAnimationProperties.tap || [];
    newAnimationProperties.tap?.push({ name: key, value: `${value}` });
  });
  return newAnimationProperties;
};
