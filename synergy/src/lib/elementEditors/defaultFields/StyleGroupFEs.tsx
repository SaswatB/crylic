import React, { useEffect, useMemo, useState } from "react";
import { faCompress, faExpand } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { startCase, uniq } from "lodash";

import { StylePropNameMap } from "../../../components/SideBar/css-options";
import { BORDER_STYLES } from "../../../constants";
import {
  useAutocomplete,
  useColorPicker,
  useCSSLengthInput,
  useSelectInput,
  useTextInput,
} from "../../../hooks/useInput";
import { StyleKeys } from "../../../types/paint";
import {
  getSelectedElementStyleValue,
  ifSelectedElementTarget_NotRenderEntry,
  isSelectedElementTarget_Component,
} from "../../../types/selected-element";
import {
  createElementEditorField,
  ElementEditorFieldProps,
} from "../ElementEditor";

interface StyleGroupFEProps extends ElementEditorFieldProps {
  styleProp: StyleKeys;
}

function useStyleGroupFE({
  selectedElement,
  styleProp,
  onChangeStyleGroup,
}: StyleGroupFEProps) {
  return {
    label: StylePropNameMap[styleProp] || startCase(`${styleProp || ""}`),
    initialValue: isSelectedElementTarget_Component(selectedElement)
      ? getSelectedElementStyleValue(selectedElement, styleProp)
      : "",
    onChange: (value: string, preview?: boolean) =>
      onChangeStyleGroup({ [styleProp]: value }, preview),
    onClear: () => onChangeStyleGroup({ [styleProp]: null }),
  };
}

// #region css length

function CSSLengthSGFE(
  props: StyleGroupFEProps & { bindInitialValue?: boolean }
) {
  const [, render] = useCSSLengthInput({
    ...useStyleGroupFE(props),
    bindInitialValue: props.bindInitialValue,
  });
  return render();
}
export const createCSSLengthSGFE = (styleProp: StyleKeys) =>
  createElementEditorField(CSSLengthSGFE, { styleProp });
export const createBoundCSSLengthSGFE = (styleProp: StyleKeys) =>
  createElementEditorField(CSSLengthSGFE, {
    styleProp,
    bindInitialValue: true,
  });

// #endregion

// #region text

function TextSGFE(props: StyleGroupFEProps & { bindInitialValue?: boolean }) {
  const [, render] = useTextInput({
    ...useStyleGroupFE(props),
    bindInitialValue: props.bindInitialValue,
  });
  return render();
}
export const creatTextSGFE = (styleProp: StyleKeys) =>
  createElementEditorField(TextSGFE, { styleProp });
export const createBoundTextSGFE = (styleProp: StyleKeys) =>
  createElementEditorField(TextSGFE, {
    styleProp,
    bindInitialValue: true,
  });

// #endregion

// #region color picker

function ColorPickerSGFE(props: StyleGroupFEProps) {
  const [, render] = useColorPicker(useStyleGroupFE(props));
  return render();
}
export const createBoundColorPickerSGFE = (styleProp: StyleKeys) =>
  createElementEditorField(ColorPickerSGFE, {
    styleProp,
    bindInitialValue: true,
  });

// #endregion

// #region autocomplete

function AutocompleteSGFE({
  options,
  config,
  ...props
}: StyleGroupFEProps & {
  options: { name: string; value: string }[];
  config?: { freeSolo?: boolean; widePopper?: boolean };
}) {
  const [, render] = useAutocomplete({
    ...useStyleGroupFE(props),
    options,
    freeSolo: config?.freeSolo ?? true,
    widePopper: config?.widePopper ?? true,
  });
  return render();
}
export const createAutocompleteSGFE = (
  styleProp: StyleKeys,
  options: { name: string; value: string }[],
  config?: { freeSolo?: boolean; widePopper?: boolean }
) => createElementEditorField(AutocompleteSGFE, { styleProp, options, config });

// #endregion

// #region select

function SelectSGFE({
  options,
  ...props
}: StyleGroupFEProps & { options: { name: string; value: string }[] }) {
  const [, render] = useSelectInput({
    ...useStyleGroupFE(props),
    options,
  });
  return render();
}
export const createSelectSGFE = (
  styleProp: StyleKeys,
  options: { name: string; value: string }[]
) => createElementEditorField(SelectSGFE, { styleProp, options });

// #endregion

// #region breakdown

function dirProp<S extends string, T extends string>(
  dir: S,
  p: T
): T extends `border${infer V}` ? `border${S}${V}` : `${T}${S}` {
  if (p.startsWith("border")) {
    return `border${dir}${p.replace("border", "")}` as any;
  }
  return `${p}${dir}` as any;
}

const topProp = <T extends string>(p: T) => dirProp("Top", p);
const bottomProp = <T extends string>(p: T) => dirProp("Bottom", p);
const leftProp = <T extends string>(p: T) => dirProp("Left", p);
const rightProp = <T extends string>(p: T) => dirProp("Right", p);

type BreakdownStyleProp =
  | "padding"
  | "margin"
  | "borderColor"
  | "borderRadius"
  | "borderStyle"
  | "borderWidth";

const BORDER_STYLE_OPTIONS = BORDER_STYLES.map((u) => ({ name: u, value: u }));

function BreakdownSGFE({
  styleProp: prop,
  ...props
}: StyleGroupFEProps & { styleProp: BreakdownStyleProp }) {
  const { selectedElement, onChangeStyleGroup } = props;

  const dir1Prop =
    prop === "borderRadius" ? "borderTopLeftRadius" : topProp(prop);
  const dir2Prop =
    prop === "borderRadius" ? "borderTopRightRadius" : bottomProp(prop);
  const dir3Prop =
    prop === "borderRadius" ? "borderBottomLeftRadius" : leftProp(prop);
  const dir4Prop =
    prop === "borderRadius" ? "borderBottomRightRadius" : rightProp(prop);

  const [showBreakdown, setShowBreakdown] = useState(false);
  const renderExpand = () => (
    <button
      title={`Expand ${startCase(prop)} Options`}
      onClick={() => {
        if (!isSelectedElementTarget_Component(selectedElement)) return;
        setShowBreakdown(true);
        // todo only update styles if prop is defined for this style group
        void onChangeStyleGroup({
          [prop]: null,
          [dir1Prop]: selectedElement.target.computedStyles[prop],
          [dir2Prop]: selectedElement.target.computedStyles[prop],
          [dir3Prop]: selectedElement.target.computedStyles[prop],
          [dir4Prop]: selectedElement.target.computedStyles[prop],
        });
      }}
    >
      <FontAwesomeIcon icon={faExpand} />
    </button>
  );
  const renderCollapse = () => (
    <button
      title={`Consolidate ${startCase(prop)} Options`}
      onClick={() => {
        if (!isSelectedElementTarget_Component(selectedElement)) return;
        setShowBreakdown(false);
        // todo only update styles if prop is defined for this style group
        void onChangeStyleGroup({
          // todo do an average or pick min/max
          [prop]: selectedElement.target.computedStyles[dir1Prop],
          [dir1Prop]: null,
          [dir2Prop]: null,
          [dir3Prop]: null,
          [dir4Prop]: null,
        });
      }}
    >
      <FontAwesomeIcon icon={faCompress} />
    </button>
  );

  const useInput =
    prop === "borderStyle"
      ? useSelectInput
      : prop === "borderColor"
      ? useColorPicker
      : useCSSLengthInput;

  const options = useMemo(
    () => (prop === "borderStyle" ? BORDER_STYLE_OPTIONS : []),
    [prop]
  );

  const [selectedElementPropTop, renderPropTopInput] = useInput({
    ...useStyleGroupFE({ styleProp: dir1Prop, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
    options,
  });

  const [selectedElementPropBottom, renderPropBottomInput] = useInput({
    ...useStyleGroupFE({ styleProp: dir2Prop, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
    options,
  });

  const [selectedElementPropLeft, renderPropLeftInput] = useInput({
    ...useStyleGroupFE({ styleProp: dir3Prop, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
    options,
  });

  const [selectedElementPropRight, renderPropRightInput] = useInput({
    ...useStyleGroupFE({ styleProp: dir4Prop, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
    options,
  });

  // reset breakdown visibility on selected element change
  const refreshBreakdown = (allowUnset = false) => {
    const show =
      uniq([
        selectedElementPropTop,
        selectedElementPropBottom,
        selectedElementPropLeft,
        selectedElementPropRight,
      ]).length > 1;
    if (allowUnset || show) setShowBreakdown(show);
  };
  useEffect(() => {
    refreshBreakdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedElementPropBottom,
    selectedElementPropLeft,
    selectedElementPropRight,
    selectedElementPropTop,
  ]);
  useEffect(() => {
    refreshBreakdown(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ifSelectedElementTarget_NotRenderEntry(selectedElement)?.target.lookupId,
  ]);

  const [, renderPropInput] = useInput({
    ...useStyleGroupFE({ styleProp: prop, ...props }),
    bindInitialValue: true,
    endAddon: renderExpand(),
    options,
  });

  if (!showBreakdown) return renderPropInput();
  return (
    <>
      {renderPropTopInput()}
      {renderPropBottomInput()}
      {renderPropLeftInput()}
      {renderPropRightInput()}
    </>
  );
}
export const createBreakdownSGFE = (styleProp: BreakdownStyleProp) =>
  createElementEditorField(BreakdownSGFE, { styleProp });

// #endregion
