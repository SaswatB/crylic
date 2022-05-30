import React, { useEffect, useMemo } from "react";
import ReactTooltip from "react-tooltip";
import styled from "@emotion/styled";
import { faTrash } from "@fortawesome/free-solid-svg-icons";

import { Button } from "../../components/base/Button";
import { IconButton } from "../../components/IconButton";
import { useInputFunction } from "../../hooks/useInput";

export function InputRowWrapper({
  label,
  tooltip,
  onClear,
  children,
}: {
  label?: string;
  tooltip?: string;
  onClear?: () => void;
  children: JSX.Element;
}) {
  useEffect(() => {
    tooltip && void ReactTooltip.rebuild();
  }, [tooltip]);
  const multilineTooltip = useMemo(() => {
    if (!tooltip) return undefined;
    return tooltip.split("\n").join("<br />");
  }, [tooltip]);

  return (
    <InputRow>
      <InputRowLabel
        data-tip={multilineTooltip}
        data-place="left"
        data-class="type-tooltip"
        data-multiline
      >
        {label}
      </InputRowLabel>
      {children}
      <div style={{ width: 21 }}>
        {onClear ? (
          <IconButton
            className="ml-2"
            title="Clear"
            icon={faTrash}
            onClick={onClear}
          />
        ) : null}
      </div>
    </InputRow>
  );
}

export function useInputRowWrapper<
  S extends { label?: string; onClear?: () => void },
  T,
  U,
  R extends readonly [any, (props?: T) => JSX.Element, ...any]
>(useInput: useInputFunction<Omit<S, "onClear">, T, U, R>, props: S) {
  const [value, render] = useInput({ ...props, label: undefined });
  return [
    value,
    (renderProps?: T) => (
      <InputRowWrapper {...props}>{render(renderProps)}</InputRowWrapper>
    ),
  ] as const;
}

const InputRow = styled("div", {
  target: "input-row",
})`
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 10px 30px;
  font-size: 14px;

  & + & {
    padding-top: 0;
  }

  .rc-color-picker-wrap {
    margin-top: 5px;
  }

  .MuiFormControl-root {
    max-width: 150px;

    input,
    select,
    .MuiInputBase-multiline {
      padding: 6px;
    }
  }
  .MuiInputAdornment-root {
    .MuiSelect-icon {
      display: none;
    }
    .breakdown-action {
      margin-top: 4px;
      margin-left: 3px;
    }
  }
  .MuiInputBase-root {
    font-size: 14px;
  }
  .MuiAutocomplete-root {
    max-width: 150px;
    width: 100%;

    .MuiAutocomplete-inputRoot {
      padding: 0px;
    }
  }
`;

const InputRowLabel = styled.div`
  flex: 1;
  opacity: 0.8;
  margin-right: 10px;
`;

export const InputRowBlockButton = styled(Button)`
  margin: 10px 30px;
  text-align: center;

  & + &,
  ${InputRow} + & {
    margin-top: 0;
  }
  & + ${InputRow} {
    padding-top: 0;
  }
`;
