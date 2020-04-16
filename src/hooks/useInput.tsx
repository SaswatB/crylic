import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FormControl,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Select,
  TextField,
} from "@material-ui/core";
import Slider, { SliderProps } from "@material-ui/core/Slider";
import ColorPicker from "rc-color-picker";
import rgbHex from "rgb-hex";

import { useThrottle } from "./useThrottle";
import "rc-color-picker/assets/index.css";

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

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
      onChange={(e, v) => {
        setValue(v as number);
        onChange(v as number);
      }}
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
        onChange={(e) => {
          setValue(e.target.value as string);
          onChange(e.target.value as string);
        }}
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
  initialValue = ""
) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setValue(initialValue ? `#${rgbHex(initialValue)}` : "");
  }, [initialValue, focused]);
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
    console.log(color, alpha, alphaSuffix);
    setValue(`${color}${alphaSuffix}`);
    onChange(`${color}${alphaSuffix}`);
  };

  const render = () => (
    <>
      <FormControl variant="outlined">
        <InputLabel>{label}</InputLabel>
        <OutlinedInput
          ref={anchor}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (HEX_COLOR_REGEX.test(e.target.value)) onChange(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          endAdornment={
            <InputAdornment position="end">
              <ColorPicker
                animation="slide-up"
                color={value}
                onChange={onColorPickerChange}
              />
            </InputAdornment>
          }
          labelWidth={label.length * 8.7}
        />
      </FormControl>
    </>
  );

  const throttledValue = useThrottle(value, 300);
  return [throttledValue, render] as const;
}
