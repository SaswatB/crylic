import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import ColorPicker from "rc-color-picker";

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
  const debounceOnChangeRef = useRef(debounce((c: string) => onChange(c), 300));
  const [tempValue, setTempValue] = useState(value);
  useEffect(() => setTempValue(value), [value]);

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
      color={tempValue}
      onChange={onColorPickerChange}
    />
  );
};
