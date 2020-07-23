import React, { FunctionComponent, useRef } from "react";
import { debounce } from "lodash";
import ColorPicker from "rc-color-picker";

import { useBoundState } from "../hooks/useBoundState";
import { useUpdatingRef } from "../hooks/useUpdatingRef";

interface Props {
  value: string;
  onChange: (c: string) => void;
  onTempChange?: (c: string) => void;
}
export const DebouncingColorPicker: FunctionComponent<Props> = ({
  value,
  onChange,
  onTempChange,
}) => {
  const onChangeRef = useUpdatingRef(onChange);
  const debounceOnChangeRef = useRef(
    debounce((c: string) => onChangeRef.current(c), 300)
  );
  const [tempValue, setTempValue] = useBoundState(value);

  const onColorPickerChange = ({
    color,
    alpha,
  }: {
    color: string;
    alpha: number;
  }) => {
    let alphaSuffix = "";
    if (alpha !== 100) {
      alphaSuffix = Math.round((alpha / 100) * 255)
        .toString(16)
        .padStart(2, "0");
    }
    const newValue = `${color}${alphaSuffix}`;
    setTempValue(newValue);
    onTempChange?.(newValue);
    debounceOnChangeRef.current(newValue);
  };

  return (
    <ColorPicker
      animation="slide-up"
      defaultColor="#000000"
      color={tempValue}
      onChange={onColorPickerChange}
    />
  );
};
