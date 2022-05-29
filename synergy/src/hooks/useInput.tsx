import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import {
  Divider,
  FormControl,
  FormControlProps,
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
  AutocompleteProps,
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import { isEqual } from "lodash";
import rgbHex from "rgb-hex";

import { DebouncingColorPicker } from "../components/DebouncingColorPicker";
import { CSS_LENGTH_UNITS } from "../constants";
import { useBoundState } from "./useBoundState";
import { useDebouncedFunction } from "./useDebouncedFunction";
import { useLocalStorage } from "./useLocalStorage";
import { useThrottle } from "./useThrottle";

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export type useInputFunction<
  S = {},
  T = any,
  U = string,
  R = readonly [U, (props?: T) => JSX.Element]
> = (
  config: {
    onChange?: (value: U, preview?: boolean) => void;
    label?: string;
    initialValue?: U;
  } & S
) => R;

export const useTextInput: useInputFunction<
  {
    bindInitialValue?: boolean;
    password?: boolean;
    validate?: (v: string) => boolean;
  },
  TextFieldProps,
  string,
  readonly [
    string,
    (props?: TextFieldProps) => JSX.Element,
    boolean,
    (v?: boolean) => void,
    (v: string) => void
  ]
> = ({
  bindInitialValue,
  password,
  validate,
  onChange,
  label,
  initialValue,
}) => {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useBoundState(
    initialValue || "",
    !!bindInitialValue && !focused
  );
  const isValid = validate?.(value) ?? true;
  const [allowError, setAllowError] = useState(false);

  useEffect(() => {
    if (focused && !allowError) setAllowError(true);
  }, [focused, allowError]);

  const render = (props?: TextFieldProps) => (
    <TextField
      {...props}
      label={label}
      variant="outlined"
      type={password ? "password" : undefined}
      error={!isValid && allowError && !focused}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange?.(e.target.value);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      helperText={
        (value || !focused) && !isValid && allowError
          ? "Invalid value"
          : props?.helperText
      }
    />
  );

  return [value, render, isValid, (v) => setAllowError(v ?? true), setValue];
};
export const useTextInputStructured = (
  props: Parameters<typeof useTextInput>[0]
) => {
  const [value, render, isValid, triggerValidation] = useTextInput(props);
  return { value, render, isValid, triggerValidation };
};
export const TextInput: FunctionComponent<
  Parameters<typeof useTextInput>[0]
> = (props) => {
  const [, render] = useTextInput(props);
  return render();
};

export const useCSSLengthInput: useInputFunction<{
  bindInitialValue?: boolean;
  endAddon?: React.ReactNode;
}> = ({ bindInitialValue, endAddon, onChange, label, initialValue }) => {
  const [focused, setFocused] = useState(false);
  const [numberValue, setNumberValue] = useState("0");
  const [unit, setUnit] = useState("px");
  const value =
    bindInitialValue && !focused
      ? numberValue === ""
        ? ""
        : `${numberValue}${unit}`
      : initialValue || "";
  useEffect(() => {
    if (bindInitialValue && !focused) {
      // extract the number and unit from the css property
      const res = /(-?[\d.]+)?([^\d.]+)/.exec(initialValue || "");
      setNumberValue(res?.[1] || "");
      setUnit(res?.[2] || "px");
    }
  }, [bindInitialValue, focused, initialValue]);

  const onChangeDebounced = useDebouncedFunction(onChange || (() => {}), 1000);

  const updateValue = (newNumberValue = numberValue, newUnit = unit) => {
    const newValue = newNumberValue === "" ? "" : `${newNumberValue}${newUnit}`;
    setNumberValue(newNumberValue);
    setUnit(newUnit);
    onChange?.(newValue, true);
    onChangeDebounced(newValue);
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
          if (increment) {
            try {
              const numericalValue = parseFloat(numberValue || "0");
              updateValue(`${numericalValue + increment}`);
            } catch (e) {}
          }
        }}
        endAdornment={
          <InputAdornment position="end">
            <Select
              native
              value={unit}
              onChange={(e) => updateValue(undefined, `${e.target.value}`)}
            >
              {CSS_LENGTH_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
            {endAddon || null}
          </InputAdornment>
        }
        labelWidth={(label?.length || 0) * 6.9}
      />
    </FormControl>
  );

  return [value, render];
};
export const CSSLengthInput: FunctionComponent<
  Parameters<typeof useCSSLengthInput>[0]
> = (props) => {
  const [, render] = useCSSLengthInput(props);
  return render();
};

export const useSliderInput: useInputFunction<{}, SliderProps, number> = ({
  onChange,
  initialValue,
}) => {
  const [value, setValue] = useBoundState<number>(initialValue || 0);

  const render = (props?: SliderProps) => (
    <Slider
      {...props}
      value={value}
      onChange={(e, v) => {
        setValue(v as number);
        onChange?.(v as number);
      }}
    />
  );

  return [value, render];
};

export const useSelectInput: useInputFunction<{
  options: { name: string; value: string }[];
  endAddon?: React.ReactNode;
}> = ({ options, endAddon, onChange, label, initialValue }) => {
  const [value, setValue] = useBoundState(initialValue || "");

  const render = (props?: FormControlProps) => (
    <FormControl fullWidth variant="outlined" {...props}>
      <InputLabel>{label}</InputLabel>
      <Select
        native
        value={value}
        onChange={(e) => {
          setValue(e.target.value as string);
          onChange?.(e.target.value as string);
        }}
        label={label}
        endAdornment={
          <InputAdornment position="end">{endAddon || null}</InputAdornment>
        }
      >
        {options.map((o) => (
          <option key={o.name} value={o.value}>
            {o.name}
          </option>
        ))}
      </Select>
    </FormControl>
  );

  return [value, render];
};
export const SelectInput: FunctionComponent<
  Parameters<typeof useSelectInput>[0]
> = (props) => {
  const [, render] = useSelectInput(props);
  return render();
};

export const usePersistentSelectInput: useInputFunction<{
  options: { name: string; value: string }[];
  localStorageKey: string;
}> = ({ localStorageKey, ...props }) => {
  const [lastValue, setLastValue] = useLocalStorage<string>(localStorageKey);

  return useSelectInput({
    ...props,
    initialValue:
      props.options.find((o) => o.value === lastValue)?.value ??
      props.initialValue,
    onChange: (v) => {
      setLastValue(v);
      props.onChange?.(v);
    },
  });
};

export const useColorPicker: useInputFunction<{
  bindInitialValue?: boolean;
  endAddon?: React.ReactNode;
}> = ({ bindInitialValue, endAddon, onChange, label, initialValue }) => {
  const anchor = useRef<HTMLButtonElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useBoundState(() => {
    let newValue = initialValue || "";
    try {
      if (newValue.match(/rgba?/)) newValue = `#${rgbHex(newValue)}`;
    } catch (e) {}
    return newValue;
  }, !!bindInitialValue && !focused);

  const render = () => (
    <>
      <FormControl variant="outlined">
        <InputLabel>{label}</InputLabel>
        <OutlinedInput
          ref={anchor}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (HEX_COLOR_REGEX.test(e.target.value))
              onChange?.(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          endAdornment={
            <InputAdornment position="end">
              <DebouncingColorPicker
                className="mr-1"
                value={value}
                onChange={(newValue) => {
                  setValue(newValue);
                  onChange?.(newValue);
                }}
                onTempChange={(previewValue) => onChange?.(previewValue, true)}
              />
              {endAddon || null}
            </InputAdornment>
          }
          labelWidth={(label?.length || 0) * 6.9}
        />
      </FormControl>
    </>
  );

  const throttledValue = useThrottle(value, 300);
  return [throttledValue, render];
};
export const BoundColorPicker: FunctionComponent<
  Parameters<typeof useColorPicker>[0]
> = (props) => {
  const [, render] = useColorPicker({ bindInitialValue: true, ...props });
  return render();
};

const WidePopper = (props: PopperProps) => {
  return (
    <Popper
      {...props}
      style={{ ...props.style, width: 250 }}
      placement="bottom-start"
    />
  );
};

export const useAutocomplete: useInputFunction<{
  options: { name: string; category?: string; value: string }[];
  freeSolo?: boolean;
  widePopper?: boolean;
}> = ({ options, freeSolo, widePopper, onChange, label, initialValue }) => {
  const [value, setValue] = useBoundState(initialValue || "");
  const filter = useRef(createFilterOptions<{ name: string; value: string }>());

  const render = (
    props?: Partial<
      AutocompleteProps<
        { name: string; category?: string; value: string },
        false,
        true,
        boolean
      >
    >
  ) => (
    <Autocomplete
      {...props}
      PopperComponent={widePopper ? WidePopper : undefined}
      multiple={false}
      value={
        options.find((option) => isEqual(option.value, value)) ||
        (freeSolo && value
          ? {
              name: `${value}`,
              value,
            }
          : (null as unknown as undefined))
      }
      onChange={(event, newValue) => {
        const v =
          (newValue as { value: string })?.value ||
          (freeSolo && (newValue as string | null)) ||
          undefined;
        if (v !== undefined) {
          setValue(v);
          onChange?.(v);
        }
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
      freeSolo={freeSolo}
      renderInput={(params) => (
        <TextField {...params} label={label} variant="outlined" />
      )}
    />
  );
  return [value, render];
};

export const useMenuInput: useInputFunction<
  {
    options: (
      | { name: string; value: string; divider?: false }
      | { divider: true }
    )[];
    disableSelection?: boolean;
  },
  never,
  string,
  readonly [
    string | undefined,
    (props?: never) => JSX.Element,
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => void,
    () => void
  ]
> = ({ options, disableSelection, onChange, initialValue }) => {
  const [value, setValue] = useBoundState<string>(initialValue || "");

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = (event: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(event.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const render = () => (
    <Menu
      anchorEl={anchorEl}
      getContentAnchorEl={null}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      keepMounted
      open={!!anchorEl}
      onClose={() => setAnchorEl(null)}
    >
      {options.map((option, index) =>
        option.divider ? (
          <Divider key={index} />
        ) : (
          <MenuItem
            key={option.value}
            selected={!disableSelection && option.value === value}
            onClick={() => {
              setValue(option.value);
              onChange?.(option.value);
            }}
          >
            {option.name}
          </MenuItem>
        )
      )}
    </Menu>
  );
  return [value, render, openMenu, closeMenu];
};
