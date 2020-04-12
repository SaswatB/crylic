import React, { useState, useEffect, useRef } from "react";
import Slider, { SliderProps } from "@material-ui/core/Slider";
import Popper from "@material-ui/core/Popper";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import { ChromePicker } from "react-color";
import { useThrottle } from "./useThrottle";

export function useTextInput(initialValue = "", bindInitialValue = false) {
  const [value, setValue] = useState<string>(initialValue);
  const [focused, setFocused] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    !focused && setValue(initialValue);
  }, [initialValue]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    bindInitialValue && !focused && setValue(initialValue);
  }, [focused]);

  const render = (
    props?: React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >
  ) => (
    <input
      {...props}
      className={`${
        props?.className || ""
      } px-2 bg-transparent border border-white border-solid`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );

  return [value, render] as const;
}

export function useSliderInput(initialValue = 0) {
  const [value, setValue] = useState<number>(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);

  const render = (props?: SliderProps) => (
    <Slider
      {...props}
      value={value}
      onChange={(e, v) => setValue(v as number)}
    />
  );

  return [value, render] as const;
}

export function useSelectInput(
  options: { name: string; value: string }[],
  initialValue = ""
) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);

  const render = (
    props?: React.DetailedHTMLProps<
      React.SelectHTMLAttributes<HTMLSelectElement>,
      HTMLSelectElement
    >
  ) => (
    <select
      {...props}
      className={`${
        props?.className || ""
      } px-2 bg-transparent border border-white border-solid`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.name} value={o.value} className="bg-black">
          {o.name}
        </option>
      ))}
    </select>
  );

  return [value, render] as const;
}

export function useColorPicker(initialValue = "") {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (!open) setValue(initialValue);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const render = () => (
    <>
      <button
        ref={anchor}
        className="btn w-full"
        onClick={() => setOpen(!open)}
      >
        Open
      </button>
      <Popper open={open} anchorEl={anchor.current}>
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <ChromePicker color={value} onChange={(c) => setValue(c.hex)} />
        </ClickAwayListener>
      </Popper>
    </>
  );

  const throttledValue = useThrottle(value, 300);
  return [throttledValue, render] as const;
}
