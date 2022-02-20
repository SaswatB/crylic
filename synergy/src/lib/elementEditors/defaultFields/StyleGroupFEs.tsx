import React, { useEffect, useState } from "react";
import { faCompress, faExpand } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { startCase, uniq } from "lodash";

import { StylePropNameMap } from "../../../components/SideBar/css-options";
import {
  useAutocomplete,
  useColorPicker,
  useCSSLengthInput,
  useSelectInput,
  useTextInput,
} from "../../../hooks/useInput";
import { StyleKeys } from "../../../types/paint";
import { getSelectedElementStyleValue } from "../../../types/selected-element";
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
  if (styleProp === "fontSize")
    console.log(
      "fontsize",
      selectedElement,
      getSelectedElementStyleValue(selectedElement, styleProp)
    );
  return {
    label: StylePropNameMap[styleProp] || startCase(`${styleProp || ""}`),
    initialValue: getSelectedElementStyleValue(selectedElement, styleProp),
    onChange: (value: string, preview?: boolean) =>
      onChangeStyleGroup({ [styleProp]: value }, preview),
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
export const creatColorPickerSGFE = (styleProp: StyleKeys) =>
  createElementEditorField(ColorPickerSGFE, { styleProp });

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

function BreakdownSGFE({
  styleProp: prop,
  ...props
}: StyleGroupFEProps & { styleProp: "padding" | "margin" }) {
  const { selectedElement, onChangeStyleGroup } = props;

  const [showBreakdown, setShowBreakdown] = useState(false);
  const renderExpand = () => (
    <button
      title={`Expand ${startCase(prop)} Options`}
      onClick={() => {
        setShowBreakdown(true);
        // todo only update styles if prop is defined for this style group
        void onChangeStyleGroup({
          [prop]: null,
          [`${prop}Top`]: selectedElement.computedStyles[prop],
          [`${prop}Bottom`]: selectedElement.computedStyles[prop],
          [`${prop}Left`]: selectedElement.computedStyles[prop],
          [`${prop}Right`]: selectedElement.computedStyles[prop],
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
        setShowBreakdown(false);
        // todo only update styles if prop is defined for this style group
        void onChangeStyleGroup({
          // todo do an average or pick min/max
          [prop]: selectedElement.computedStyles[`${prop}Top`],
          [`${prop}Top`]: null,
          [`${prop}Bottom`]: null,
          [`${prop}Left`]: null,
          [`${prop}Right`]: null,
        });
      }}
    >
      <FontAwesomeIcon icon={faCompress} />
    </button>
  );

  const [selectedElementPropTop, renderPropTopInput] = useCSSLengthInput({
    ...useStyleGroupFE({ styleProp: `${prop}Top`, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
  });

  const [selectedElementPropBottom, renderPropBottomInput] = useCSSLengthInput({
    ...useStyleGroupFE({ styleProp: `${prop}Bottom`, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
  });

  const [selectedElementPropLeft, renderPropLeftInput] = useCSSLengthInput({
    ...useStyleGroupFE({ styleProp: `${prop}Left`, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
  });

  const [selectedElementPropRight, renderPropRightInput] = useCSSLengthInput({
    ...useStyleGroupFE({ styleProp: `${prop}Right`, ...props }),
    bindInitialValue: true,
    endAddon: renderCollapse(),
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
  }, [selectedElement.lookupId]);

  const [, renderPropInput] = useCSSLengthInput({
    ...useStyleGroupFE({ styleProp: prop, ...props }),
    bindInitialValue: true,
    endAddon: renderExpand(),
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
export const createBreakdownSGFE = (styleProp: "padding" | "margin") =>
  createElementEditorField(BreakdownSGFE, { styleProp });

// #endregion
