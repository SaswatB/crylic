import React, { FunctionComponent } from "react";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import {
  faBars,
  faCaretSquareDown,
  faCheckSquare,
  faCompressArrowsAlt,
  faDotCircle,
  faExternalLinkSquareAlt,
  faFont,
  faHeading,
  faHSquare,
  faLocationArrow,
  faMousePointer,
  faPlus,
  faPlusSquare,
} from "@fortawesome/free-solid-svg-icons";
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from "@fortawesome/react-fontawesome";
import Popover from "@material-ui/core/Popover";
import { isEqual } from "lodash";
import {
  bindPopover,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";

import { SelectedElement } from "../types/paint";
import { SelectMode, SelectModeType } from "../utils/constants";
import { renderSeparator } from "../utils/utils";

const useAdderTab = (
  selectMode: SelectMode | undefined,
  setSelectMode: (mode: SelectMode | undefined) => void
) => {
  const onAddElement = (
    tag: keyof HTMLElementTagNameMap,
    attributes?: Record<string, unknown>
  ) => setSelectMode({ type: SelectModeType.AddElement, tag, attributes });

  const renderAddOption = (
    name: string,
    icon: IconProp,
    tag: keyof HTMLElementTagNameMap,
    attributes?: Record<string, unknown> | undefined,
    iconProps?: Omit<FontAwesomeIconProps, "icon">
  ) => (
    <button
      className={`btn w-full ${
        selectMode?.type === SelectModeType.AddElement &&
        selectMode.tag === tag &&
        isEqual(selectMode.attributes, attributes)
          ? "active"
          : ""
      }`}
      onClick={() => onAddElement(tag, attributes)}
    >
      <FontAwesomeIcon icon={icon} {...iconProps} /> {name}
    </button>
  );

  const renderElementAdder = () => (
    <>
      {renderSeparator("Containers")}
      <div className="grid2x">
        {renderAddOption("Row", faBars, "div", { style: { display: "flex" } })}
        {renderAddOption(
          "Column",
          faBars,
          "div",
          { style: { display: "flex", flexDirection: "column" } },
          { className: "transform rotate-90" }
        )}
      </div>
      {renderSeparator("Text")}
      <div className="grid2x">
        {renderAddOption("Heading", faHeading, "h1")}
        {renderAddOption("Text", faFont, "span")}
      </div>
      {renderSeparator("Interactive")}
      <div className="grid2x">
        {renderAddOption("Button", faPlusSquare, "button")}
        {renderAddOption("Link", faExternalLinkSquareAlt, "a")}
      </div>
      {renderSeparator("Form")}
      <div className="grid2x">
        {renderAddOption("Textbox", faHSquare, "input", { type: "text" })}
        {renderAddOption("Select", faCaretSquareDown, "select")}
        {renderAddOption("Checkbox", faCheckSquare, "input", {
          type: "checkbox",
        })}
        {renderAddOption("Radio", faDotCircle, "input", { type: "radio" })}
      </div>
    </>
  );
  return renderElementAdder;
};

interface Props {
  setResetTransform: (value: boolean) => void;
  selectMode: SelectMode | undefined;
  setSelectMode: (mode: SelectMode | undefined) => void;
  selectedElement: SelectedElement | undefined;
  setSelectedElement: (selectedElement: SelectedElement | undefined) => void;
}
export const Toolbar: FunctionComponent<Props> = ({
  setResetTransform,
  selectMode,
  setSelectMode,
  selectedElement,
  setSelectedElement,
}) => {
  const adderPopupState = usePopupState({
    variant: "popover",
    popupId: "adderPopup",
  });
  const renderElementAdder = useAdderTab(selectMode, (mode) => {
    adderPopupState.close();
    setSelectMode(mode);
  });

  return (
    <>
      <div className="btngrp-h">
        <button
          className={`btn ${
            selectMode === undefined && selectedElement === undefined
              ? "active"
              : ""
          }`}
          title="Interactive Mode"
          onClick={() => {
            setSelectedElement(undefined);
            setSelectMode(undefined);
          }}
        >
          <FontAwesomeIcon icon={faMousePointer} />
        </button>
        <button
          className={`btn ${
            selectMode?.type === SelectModeType.SelectElement
              ? "superactive"
              : selectMode === undefined && selectedElement !== undefined
              ? "active"
              : ""
          }`}
          title="Select Element"
          onClick={() => setSelectMode({ type: SelectModeType.SelectElement })}
        >
          <FontAwesomeIcon
            icon={faLocationArrow}
            className="transform -rotate-90"
          />
        </button>
        <button
          className={`btn ${
            selectMode?.type === SelectModeType.AddElement ? "active" : ""
          }`}
          title="Add Element"
          {...bindTrigger(adderPopupState)}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
        <Popover
          {...bindPopover(adderPopupState)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "center",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "center",
          }}
        >
          <div className="px-8 py-2">{renderElementAdder()}</div>
        </Popover>
      </div>
      <div className="flex-1" />
      <div className="btngrp-h">
        <button className="btn" onClick={() => setResetTransform(true)}>
          <FontAwesomeIcon icon={faCompressArrowsAlt} />
        </button>
      </div>
    </>
  );
};
