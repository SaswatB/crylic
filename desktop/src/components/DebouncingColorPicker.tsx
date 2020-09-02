import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { useUpdatingRef } from "synergy/src/hooks/useUpdatingRef";

import ColorPicker from "../vendor/color-picker/ColorPicker";
import "rc-color-picker/assets/index.css";

const DEFAULT_COLOR = "#ffffff";
const DEFAULT_ALPHA = 100;

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
  const valueRef = useUpdatingRef(value);
  const [tempValue, setTempValue] = useState({
    color: DEFAULT_COLOR,
    alpha: DEFAULT_ALPHA,
  });
  useEffect(() => {
    let color = DEFAULT_COLOR;
    let alpha = DEFAULT_ALPHA;
    // convert a color hex string to a color and alpha value
    if (value.match(/^#([a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/)) {
      if (value.length === 9) {
        color = value;
      } else if (value.length === 7) {
        color = value;
      } else if (value.length === 4) {
        color = `#${value.charAt(1)}${value.charAt(1)}${value.charAt(
          2
        )}${value.charAt(2)}${value.charAt(3)}${value.charAt(3)}`;
      }
    }
    setTempValue({ color, alpha });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const queuedChange = useRef<string>();
  const flushQueuedChange = () => {
    console.log("flushQueuedChange", queuedChange.current, valueRef.current);
    if (queuedChange.current) {
      if (valueRef.current !== queuedChange.current)
        setTimeout(onChange(queuedChange.current), 100);
      queuedChange.current = undefined;
    }
  };

  const onColorPickerChange = (newValue: { color: string; alpha: number }) => {
    setTempValue(newValue);

    // convert the color and alpha to onek color string
    let alphaSuffix = "";
    if (newValue.alpha !== 100) {
      alphaSuffix = Math.round((newValue.alpha / 100) * 255)
        .toString(16)
        .padStart(2, "0");
    }
    const newColor = `${newValue.color.substring(0, 7)}${alphaSuffix}`;
    onTempChange?.(newColor);
    queuedChange.current = newColor;
  };

  return (
    <ColorPicker
      animation="slide-up"
      color={tempValue.color}
      alpha={tempValue.alpha}
      onChange={onColorPickerChange}
      // todo maybe add a debounce to apply styles if there's a long idle
      onClose={flushQueuedChange}
      onDragEnd={flushQueuedChange}
    />
  );
};
