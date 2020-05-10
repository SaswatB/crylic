import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FormControl,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  OutlinedInput,
  Popper,
  PopperProps,
  Select,
  TextField,
  TextFieldProps,
} from "@material-ui/core";
import Slider, { SliderProps } from "@material-ui/core/Slider";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import { isEqual } from "lodash";
import rgbHex from "rgb-hex";

import { DebouncingColorPicker } from "../components/DebouncingColorPicker";
import { useBoundState } from "./useBoundState";
import { useThrottle } from "./useThrottle";
import "rc-color-picker/assets/index.css";

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export function useTextInput(
  onChange = (value: string) => {},
  label = "",
  initialValue = "",
  bindInitialValue = false
) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useBoundState(
    initialValue,
    bindInitialValue && !focused
  );

  const render = (props?: TextFieldProps) => (
    <TextField
      {...props}
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
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useBoundState(
    initialValue,
    bindInitialValue && !focused
  );

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
  const updateValue = (newNumberValue = numberValue, newUnit = unit) => {
    const newValue = `${newNumberValue}${newUnit}`;
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
        onChange={(e) => updateValue(`${e.target.value}`)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(event) => {
          let increment = 0;
          if (event.keyCode === 38) {
            // increment value on up arrow
            increment = 1;
          } else if (event.keyCode === 40) {
            // decrement value on down arrow
            increment = -1;
          }
          try {
            const numericalValue = parseFloat(numberValue);
            updateValue(`${numericalValue + increment}`);
          } catch (e) {}
        }}
        endAdornment={
          <InputAdornment position="end">
            <Select
              native
              value={unit}
              onChange={(e) => updateValue(undefined, `${e.target.value}`)}
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
  const [value, setValue] = useBoundState(initialValue);

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
  const [value, setValue] = useBoundState(initialValue);

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
  onChange = (value: string, preview?: boolean) => {},
  label = "",
  initialValue = ""
) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setValue(initialValue ? `#${rgbHex(initialValue)}` : "");
  }, [initialValue, focused]);

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
              <DebouncingColorPicker
                value={value}
                onChange={(newValue) => {
                  setValue(newValue);
                  onChange(newValue);
                }}
                onTempChange={(previewValue) => onChange(previewValue, true)}
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

const WidePopper = (props: PopperProps) => {
  return (
    <Popper
      {...props}
      style={{ ...props.style, width: 250 }}
      placement="bottom-start"
    />
  );
};

export function useAutocomplete<T>(
  options: { name: string; category?: string; value: T }[],
  // if freeSolo is true T is assumed to be a string
  autoCompleteOptions?: { freeSolo?: boolean; widePopper?: boolean },
  onChange = (value: T | undefined) => {},
  label = "",
  initialValue: T | undefined = undefined
) {
  const [value, setValue] = useBoundState(initialValue);
  const filter = useRef(createFilterOptions<{ name: string; value: T }>());

  const render = () => (
    <Autocomplete
      PopperComponent={autoCompleteOptions?.widePopper ? WidePopper : undefined}
      multiple={false}
      value={
        options.find((option) => isEqual(option.value, value)) ||
        (autoCompleteOptions?.freeSolo && value
          ? {
              name: `${value}`,
              value,
            }
          : null)
      }
      onChange={(
        event: React.ChangeEvent<{}>,
        newValue: { name: string; value: T } | null
      ) => {
        const v =
          newValue?.value ||
          (autoCompleteOptions?.freeSolo && (newValue as T | null)) ||
          undefined;
        setValue(v);
        onChange(v);
      }}
      filterOptions={(options, params) => {
        const filtered = filter.current(options, params);

        // if (params.inputValue !== "") {
        //   filtered.push({
        //     name: `Add Style Sheet Rule "${params.inputValue}"`,
        //   });
        // }

        return filtered;
      }}
      options={options}
      getOptionLabel={(option) => {
        return option.name;
      }}
      groupBy={(option) => option.category || ""}
      selectOnFocus
      clearOnBlur
      disableClearable
      renderOption={(option) => option.name}
      freeSolo={autoCompleteOptions?.freeSolo}
      renderInput={(params) => (
        <TextField {...params} label={label} variant="outlined" />
      )}
    />
  );
  return [value, render] as const;
}

export function useMenuInput(
  options: { name: string; value: string }[],
  onChange = (value: string) => {},
  label = "",
  initialValue = ""
) {
  const [value, setValue] = useBoundState<string>(initialValue);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const render = () => (
    <Menu
      anchorEl={anchorEl}
      getContentAnchorEl={null}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      keepMounted
      open={!!anchorEl}
      onClose={() => setAnchorEl(null)}
    >
      {options.map((option) => (
        <MenuItem
          key={option.value}
          selected={option.value === value}
          onClick={() => {
            setValue(option.value);
            onChange(option.value);
          }}
        >
          {option.name}
        </MenuItem>
      ))}
    </Menu>
  );
  return [value, render, openMenu] as const;
}
