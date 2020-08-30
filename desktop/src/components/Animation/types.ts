export enum AnimationType {
  ENTRANCE = "entrance",
  HOVER = "hover",
  TAP = "tap",
  // EXIT = "exit",
}

interface TransitionAnimationProperty {
  name: string;
  value: string;
}

interface EntranceAnimationProperty {
  name: string;
  initial: string;
  value?: string;
}
export type AnimationProperty =
  | EntranceAnimationProperty
  | TransitionAnimationProperty;

export type AnimationPropertyMap = {
  [index in AnimationType]?: AnimationProperty[];
};

export function isEntranceAnimationProperty(
  prop: AnimationProperty
): prop is EntranceAnimationProperty {
  return "initial" in prop;
}

export enum AnimationPropertyInputType {
  CSS_LENGTH,
  STRING,
  NUMBER,
  COLOR,
}
