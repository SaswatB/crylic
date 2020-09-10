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
  faSearchMinus,
  faSearchPlus,
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

import { SelectMode, SelectModeType } from "../constants";
import { usePackageInstallerRecoil } from "../hooks/recoil/usePackageInstallerRecoil";
import { useProjectRecoil } from "../hooks/recoil/useProjectRecoil/useProjectRecoil";
import { useSelectRecoil } from "../hooks/recoil/useSelectRecoil";
import { useGlobalConfig } from "../hooks/useGlobalConfig";
import { useSelectInput } from "../hooks/useInput";
import { Project } from "../lib/project/Project";
import { renderSeparator } from "../lib/render-utils";
import { ComponentViewZoomAction, PackageInstaller } from "../types/paint";
import { Tour } from "./Tour/Tour";

const useAdderTab = (
  project: Project | undefined,
  selectMode: SelectMode | undefined,
  setSelectMode: (mode: SelectMode | undefined) => void,
  installPackages: PackageInstaller
) => {
  const { config } = useGlobalConfig();

  const [
    selectedComponentConfigIndex,
    renderSelectComponentConfig,
  ] = useSelectInput({
    options: [
      { name: "Default", value: "-1" },
      ...config.componentConfigs.map((config, index) => ({
        name: config.name,
        value: `${index}`,
      })),
    ],
    label: "Component Library",
    initialValue: "-1",
  });

  const renderHTMLAddOption = (
    name: string,
    icon: IconProp,
    tag: keyof HTMLElementTagNameMap,
    attributes?: Record<string, unknown>,
    iconProps?: Omit<FontAwesomeIconProps, "icon">
  ) => (
    <button
      className={`btn w-full ${
        selectMode?.type === SelectModeType.AddElement &&
        selectMode.isHTMLElement &&
        selectMode.tag === tag &&
        isEqual(selectMode.attributes, attributes)
          ? "active"
          : ""
      }`}
      onClick={() =>
        setSelectMode({
          type: SelectModeType.AddElement,
          isHTMLElement: true,
          tag,
          attributes,
        })
      }
    >
      <FontAwesomeIcon icon={icon} {...iconProps} /> {name}
    </button>
  );

  const renderDefaultElementAdder = () => (
    <>
      {renderSeparator("Containers")}
      <div className="grid2x">
        {renderHTMLAddOption("Row", faBars, "div", {
          style: { display: "flex" },
        })}
        {renderHTMLAddOption(
          "Column",
          faBars,
          "div",
          { style: { display: "flex", flexDirection: "column" } },
          { className: "transform rotate-90" }
        )}
      </div>
      {renderSeparator("Text")}
      <div className="grid2x">
        {renderHTMLAddOption("Heading", faHeading, "h1", {
          textContent: "Heading",
        })}
        {renderHTMLAddOption("Text", faFont, "span", { textContent: "Text" })}
      </div>
      {renderSeparator("Interactive")}
      <div className="grid2x">
        {renderHTMLAddOption("Button", faPlusSquare, "button")}
        {renderHTMLAddOption("Link", faExternalLinkSquareAlt, "a")}
      </div>
      {renderSeparator("Form")}
      <div className="grid2x">
        {renderHTMLAddOption("Textbox", faHSquare, "input", { type: "text" })}
        {renderHTMLAddOption("Select", faCaretSquareDown, "select")}
        {renderHTMLAddOption("Checkbox", faCheckSquare, "input", {
          type: "checkbox",
        })}
        {renderHTMLAddOption("Radio", faDotCircle, "input", { type: "radio" })}
      </div>
    </>
  );

  const renderConfigElementAdder = () => {
    const componentConfig =
      config.componentConfigs[parseInt(selectedComponentConfigIndex)];
    if (!componentConfig) return null; // todo error

    if (project && !componentConfig.installed(project)) {
      return (
        <>
          <div className="p-4 text-center">
            {componentConfig.name} is not installed in this project
          </div>
          <button
            className="btn mb-4 w-full"
            onClick={() => componentConfig.install(project, installPackages)}
          >
            Install
          </button>
        </>
      );
    }
    return (
      <div className="btngrp-v flex flex-col mt-2 w-64">
        {componentConfig.components.map((component, index) => (
          <button
            key={index}
            className={`btn ${
              selectMode?.type === SelectModeType.AddElement &&
              !selectMode.isHTMLElement &&
              selectMode.component === component
                ? "active"
                : ""
            }`}
            onClick={() =>
              setSelectMode({
                type: SelectModeType.AddElement,
                component,
              })
            }
          >
            {component.name}
          </button>
        ))}
      </div>
    );
  };

  return () => (
    <>
      {renderSelectComponentConfig({ style: { marginTop: 10 } })}
      {selectedComponentConfigIndex === "-1"
        ? renderDefaultElementAdder()
        : renderConfigElementAdder()}
    </>
  );
};

interface Props {
  setZoomAction: (action: ComponentViewZoomAction) => void;
}
export const Toolbar: FunctionComponent<Props> = ({ setZoomAction }) => {
  const { project } = useProjectRecoil();
  const { installPackages } = usePackageInstallerRecoil();
  const {
    selectMode,
    setSelectMode,
    selectedElement,
    clearSelectedElement,
  } = useSelectRecoil();
  const adderPopupState = usePopupState({
    variant: "popover",
    popupId: "adderPopup",
  });
  const renderElementAdder = useAdderTab(
    project,
    selectMode,
    (mode) => {
      adderPopupState.close();
      setSelectMode(mode);
    },
    installPackages
  );

  return (
    <>
      <div className="btngrp-h overflow-unset">
        <Tour
          name="interactive-mode"
          beaconStyle={{
            marginTop: 20,
            marginLeft: 20,
          }}
        >
          This button enables interactive mode. <br />
          Interactive mode allows you to interact with your component similar to
          how it would run in a browser in the component view below.
        </Tour>
        <button
          className={`btn ${
            selectMode === undefined && selectedElement === undefined
              ? "active"
              : ""
          }`}
          data-tour="interactive-mode"
          title="Interactive Mode"
          onClick={() => {
            clearSelectedElement();
            setSelectMode(undefined);
          }}
        >
          <FontAwesomeIcon icon={faMousePointer} />
        </button>
        <Tour
          name="select-mode"
          beaconStyle={{
            marginTop: 20,
            marginLeft: 20,
          }}
        >
          This button enables select mode. <br />
          Select mode allows you to select elements from the component view
          below and edit them from the sidebar, as well as drag to move or
          resize within the component view itself.
        </Tour>
        <button
          className={`btn ${
            selectMode?.type === SelectModeType.SelectElement
              ? "superactive"
              : selectMode === undefined && selectedElement !== undefined
              ? "active"
              : ""
          }`}
          data-tour="select-mode"
          title="Select Element"
          onClick={() => setSelectMode({ type: SelectModeType.SelectElement })}
        >
          <FontAwesomeIcon
            icon={faLocationArrow}
            className="transform -rotate-90"
          />
        </button>
        <Tour
          name="add-mode"
          beaconStyle={{
            marginTop: 20,
            marginLeft: 20,
          }}
        >
          This button enables add mode. <br />
          Add mode allows you to add elements to your components in the
          component view below.
        </Tour>
        <button
          className={`btn ${
            selectMode?.type === SelectModeType.AddElement ? "superactive" : ""
          }`}
          data-tour="add-mode"
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
        <button
          className="btn"
          title="Zoom In"
          onClick={() => setZoomAction(ComponentViewZoomAction.ZOOM_IN)}
        >
          <FontAwesomeIcon icon={faSearchPlus} />
        </button>
        <button
          className="btn"
          title="Zoom Out"
          onClick={() => setZoomAction(ComponentViewZoomAction.ZOOM_OUT)}
        >
          <FontAwesomeIcon icon={faSearchMinus} />
        </button>
        <button
          className="btn"
          title="Reset Zoom"
          onClick={() => setZoomAction(ComponentViewZoomAction.RESET)}
        >
          <FontAwesomeIcon icon={faCompressArrowsAlt} />
        </button>
      </div>
    </>
  );
};
