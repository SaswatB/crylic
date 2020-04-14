import React, { useState, useEffect, useRef, ReactNode, useMemo } from "react";
import Slider, { SliderProps } from "@material-ui/core/Slider";
import Popper from "@material-ui/core/Popper";
import ClickAwayListener from "@material-ui/core/ClickAwayListener";
import { ChromePicker } from "react-color";
import { useThrottle } from "./useThrottle";
import {
  FormControl,
  InputLabel,
  Select,
  TextField,
  OutlinedInput,
  InputAdornment,
} from "@material-ui/core";

export function useTextInput(
  onChange = (value: string) => {},
  label = "",
  initialValue = "",
  bindInitialValue = false
) {
  const [value, setValue] = useState<string>(initialValue);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    !focused && setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);
  useEffect(() => {
    bindInitialValue && !focused && setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const render = (
    props?: React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >
  ) => (
    <TextField
      label={label}
      variant="outlined"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange(e.target.value);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );

  return [value, render] as const;
}

export function useCSSLengthInput(
  onChange = (value: string) => {},
  label = "",
  initialValue = "",
  bindInitialValue = false
) {
  const [value, setValue] = useState<string>(initialValue);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    !focused && setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);
  useEffect(() => {
    bindInitialValue && !focused && setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused]);

  const units = [
    { name: "px", value: "px" },
    { name: "%", value: "%" },
    { name: "em", value: "em" },
    { name: "vh", value: "vh" },
    { name: "vw", value: "vw" },
    { name: "ex", value: "ex" },
    { name: "cm", value: "cm" },
    { name: "mm", value: "mm" },
    { name: "in", value: "in" },
    { name: "pt", value: "pt" },
    { name: "pc", value: "pc" },
    { name: "ch", value: "ch" },
    { name: "rem", value: "rem" },
    { name: "vmin", value: "vmin" },
    { name: "vmax", value: "vmax" },
  ];

  const { numberValue, unit } = useMemo(() => {
    const res = /(\d+)(.+)/.exec(value);
    return res ? { numberValue: res[1], unit: res[2] } : { numberValue: value };
  }, [value]);
  const updateValue = (newValue: string) => {
    setValue(newValue);
    onChange(newValue);
  };

  const render = (
    props?: React.DetailedHTMLProps<
      React.InputHTMLAttributes<HTMLInputElement>,
      HTMLInputElement
    >
  ) => (
    <FormControl variant="outlined">
      <InputLabel>{label}</InputLabel>
      <OutlinedInput
        value={numberValue}
        onChange={(e) => updateValue(`${e.target.value}${unit}`)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        endAdornment={
          <InputAdornment position="end">
            <Select
              native
              value={unit}
              onChange={(e) => updateValue(`${numberValue}${e.target.value}`)}
            >
              {units.map((o) => (
                <option key={o.name} value={o.value}>
                  {o.name}
                </option>
              ))}
            </Select>
          </InputAdornment>
        }
        labelWidth={label.length * 8.7}
      />
    </FormControl>
  );

  return [value, render] as const;
}

export function useSliderInput(
  onChange = (value: number) => {},
  label = "",
  initialValue = 0
) {
  const [value, setValue] = useState<number>(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);

  const render = (props?: SliderProps) => (
    <Slider
      {...props}
      value={value}
      onChange={(e, v) => {setValue(v as number); onChange(v as number);}}
    />
  );

  return [value, render] as const;
}

export function useSelectInput(
  options: { name: string; value: string }[],
  onChange = (value: string) => {},
  label = "",
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
    <FormControl fullWidth variant="outlined">
      <InputLabel>{label}</InputLabel>
      <Select
        native
        value={value}
        onChange={(e) => {setValue(e.target.value as string); onChange(e.target.value as string);}}
        label={label}
      >
        {options.map((o) => (
          <option key={o.name} value={o.value}>
            {o.name}
          </option>
        ))}
      </Select>
    </FormControl>
  );

  return [value, render] as const;
}

export function useColorPicker(
  onChange = (value: string) => {},
  label = "",
  initialValue = "",
  btnText: ReactNode = "Open"
) {
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
        {btnText}
      </button>
      <Popper open={open} anchorEl={anchor.current}>
        <ClickAwayListener onClickAway={() => setOpen(false)}>
          <ChromePicker color={value} onChange={(c) => {setValue(c.hex); onChange(c.hex);}} />
        </ClickAwayListener>
      </Popper>
    </>
  );

  const throttledValue = useThrottle(value, 300);
  return [throttledValue, render] as const;
}
