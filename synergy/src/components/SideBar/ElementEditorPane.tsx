import React, {
  CSSProperties,
  FunctionComponent,
  useEffect,
  useMemo,
  useState,
} from "react";
import ReactPlaceholder from "react-placeholder";
import {
  faCompress,
  faCrosshairs,
  faExpand,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { startCase, uniq } from "lodash";
import path from "path";
import { useBus } from "ts-bus/react";

import { usePackageInstallerRecoil } from "../../hooks/recoil/usePackageInstallerRecoil";
import { useProjectRecoil } from "../../hooks/recoil/useProjectRecoil";
import { updateStyleGroupHelper } from "../../hooks/recoil/useProjectRecoil/code-edit-helpers";
import { useSelectRecoil } from "../../hooks/recoil/useSelectRecoil";
import { useDebouncedFunction } from "../../hooks/useDebouncedFunction";
import {
  useAutocomplete,
  useColorPicker,
  useCSSLengthInput,
  useInputFunction,
  useMenuInput,
  useSelectInput,
  useTextInput,
} from "../../hooks/useInput";
import { useObservable } from "../../hooks/useObservable";
import { StyleGroup } from "../../lib/ast/editors/ASTEditor";
import { linkComponent } from "../../lib/defs/react-router-dom";
import { editorOpenLocation } from "../../lib/events";
import { renderSeparator } from "../../lib/render-utils";
import { isImageEntry } from "../../lib/utils";
import { CodeEntry } from "../../types/paint";
import { AnimationEditorModal } from "../Animation/AnimationEditorModal";
import { Collapsible } from "../Collapsible";
import { IconButton } from "../IconButton";
import { Tour } from "../Tour";
import {
  CSS_ALIGN_ITEMS_OPTIONS,
  CSS_BACKGROUND_SIZE_OPTIONS,
  CSS_BOX_SIZING_OPTIONS,
  CSS_CURSOR_OPTIONS,
  CSS_DISPLAY_OPTIONS,
  CSS_FLEX_DIRECTION_OPTIONS,
  CSS_FLEX_WRAP_OPTIONS,
  CSS_FONT_FAMILY_OPTIONS,
  CSS_FONT_WEIGHT_OPTIONS,
  CSS_JUSTIFY_CONTENT_OPTIONS,
  CSS_POSITION_OPTIONS,
  CSS_TEXT_ALIGN_OPTIONS,
  CSS_TEXT_DECORATION_LINE_OPTIONS,
} from "./css-options";

type EditorHook<T> = useInputFunction<
  {
    onChange: (v: string, preview?: boolean) => void;
    label: string;
  } & T,
  { className?: string; style?: CSSProperties }
>;

const StylePropNameMap: { [index in keyof CSSStyleDeclaration]?: string } = {
  backgroundColor: "Fill",
  backgroundImage: "Image",
  backgroundSize: "Image Size",
  flexDirection: "Direction",
  flexWrap: "Wrap",
  alignItems: "Align",
  justifyContent: "Justify",
  textAlign: "Align",
  fontSize: "Size",
  fontWeight: "Weight",
  fontFamily: "Font",
  textDecorationLine: "Decoration",
};

const useBoundTextInput: useInputFunction = (config) =>
  useTextInput({ ...config, bindInitialValue: true });
const useBoundCSSLengthInput: useInputFunction = (config) =>
  useCSSLengthInput({ ...config, bindInitialValue: true });

const useSelectedElementImageEditor = (imageProp: "backgroundImage") => {
  const { project, setCodeAstEdit } = useProjectRecoil();
  const { selectedElement, selectedStyleGroup } = useSelectRecoil();

  const onChange = (assetEntry: CodeEntry) => {
    if (!selectedStyleGroup) return;
    setCodeAstEdit(
      updateStyleGroupHelper(selectedStyleGroup, (editor, editContext) =>
        editor.updateElementImage(editContext, imageProp, assetEntry)
      )
    );
  };
  const label = StylePropNameMap[imageProp] || startCase(`${imageProp || ""}`);
  const initialValue =
    selectedElement?.inlineStyles[imageProp] ||
    selectedElement?.computedStyles[imageProp] ||
    "";

  const [, renderMenu, openMenu, closeMenu] = useMenuInput({
    options: (project?.codeEntries || []).filter(isImageEntry).map((entry) => ({
      name: path.basename(entry.filePath),
      value: entry.id,
    })),
    disableSelection: true,
    onChange: (newCodeId: string) => {
      closeMenu();
      onChange(project!.getCodeEntry(newCodeId)!);
    },
  });

  const [selectedElementValue, renderValueInput] = useBoundTextInput({
    label,
    initialValue: `${initialValue}`,
  });

  return [
    selectedElementValue,
    (props?: {
      className?: string | undefined;
      style?: React.CSSProperties | undefined;
    }) => (
      <>
        {renderValueInput({ ...props, onClick: openMenu })}
        {renderMenu()}
      </>
    ),
  ] as const;
};

const TEXT_TAGS = [
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "button",
  "a",
];

export const ElementEditorPane: FunctionComponent = () => {
  const bus = useBus();
  const { project, toggleCodeEntryEdit } = useProjectRecoil();
  const { installPackages } = usePackageInstallerRecoil();
  const {
    selectedElement,
    updateSelectedElement,
    selectedStyleGroup,
    updateSelectedStyleGroup,
    setSelectedStyleGroup,
  } = useSelectRecoil();

  const openInEditor = ({ editor, lookupId }: StyleGroup) => {
    const codeId = editor.getCodeIdFromLookupId(lookupId);
    if (!codeId) return;
    const codeEntry = project?.getCodeEntry(codeId);
    if (!codeEntry) return;
    const line = editor.getCodeLineFromLookupId(
      { codeEntry, ast: codeEntry.ast },
      lookupId
    );
    console.log("openInEditor", codeEntry, line);
    let timeout = 0;
    if (!project?.editEntries.find((e) => e.codeId === codeEntry.id)) {
      toggleCodeEntryEdit(codeEntry);
      // todo don't cheat with a timeout here
      timeout = 500;
    }
    setTimeout(
      () => bus.publish(editorOpenLocation({ codeEntry, line })),
      timeout
    );
  };
  // don't allow text edits on elements with non-text nodes
  // TODO: allow partial edits
  // allow editing elements with text or elements that are supposed to have text
  const allowTextEdit = useMemo(
    () =>
      !Array.from(selectedElement?.element.childNodes || []).find(
        (node) => node.nodeType !== Node.TEXT_NODE
      ) &&
      (TEXT_TAGS.includes(
        selectedElement?.element.tagName.toLowerCase() || ""
      ) ||
        (selectedElement?.element.textContent?.trim().length ?? 0) > 0),
    [selectedElement]
  );

  // debounce text entry
  const updateSelectedElementDebounced = useDebouncedFunction(
    updateSelectedElement,
    1000
  );

  const [, renderTextContentInput] = useBoundTextInput({
    onChange: (newTextContent) => {
      selectedElement!.element.textContent = newTextContent;
      updateSelectedElementDebounced((editor, editContext) =>
        editor.updateElementText(editContext, newTextContent)
      );
    },
    label: "Text Content",
    initialValue: selectedElement?.element.textContent ?? undefined,
  });

  const [, renderIDInput] = useBoundTextInput({
    onChange: (newID) =>
      updateSelectedElement((editor, editContext) =>
        editor.updateElementAttributes(editContext, { id: newID })
      ),
    label: "Identifier",
    initialValue: selectedElement?.element.id ?? undefined,
  });

  const routeDefinition = useObservable(
    selectedElement?.viewContext?.onRoutesDefined
  );
  const selectedElementIsRouterLink =
    !!routeDefinition &&
    selectedElement?.sourceMetadata?.componentName === "Link";
  const [, renderLinkTargetInput] = useAutocomplete({
    options: (routeDefinition?.routes || []).map((availableRoute) => ({
      name: availableRoute,
      value: availableRoute,
    })),
    freeSolo: true,
    onChange: (newHref) => {
      const shouldBeRouterLink =
        !!routeDefinition &&
        (newHref?.startsWith("/") || newHref?.startsWith("."));
      updateSelectedElement((editor, editContext) => {
        let ast = editContext.ast;
        // rename the link component if it's better used as a router link
        // todo add option to disable this
        if (shouldBeRouterLink !== selectedElementIsRouterLink) {
          ast = editor.updateElementComponent(
            { ...editContext, ast },
            shouldBeRouterLink
              ? { component: linkComponent }
              : {
                  isHTMLElement: true,
                  tag: "a",
                }
          );
        }
        return editor.updateElementAttributes(
          { ...editContext, ast },
          shouldBeRouterLink ? { to: newHref } : { href: newHref }
        );
      });
    },
    label: "Link Target",
    // todo support alias for Link
    initialValue:
      ((selectedElementIsRouterLink &&
        `${selectedElement?.sourceMetadata?.directProps.to || ""}`) ||
        (selectedElement?.element as HTMLLinkElement)?.getAttribute("href")) ??
      undefined,
  });

  const styleGroupOptions = (selectedElement?.styleGroups || []).map(
    (group) => ({
      name: `${group.name}`,
      category: group.category,
      value: group,
    })
  );
  const [, renderStyleGroupSelector] = useAutocomplete({
    // @ts-expect-error todo fix type error caused by generics
    options: styleGroupOptions,
    // @ts-expect-error todo fix type error caused by generics
    onChange: setSelectedStyleGroup,
    // @ts-expect-error todo fix type error caused by generics
    initialValue: selectedStyleGroup,
  });

  const useSelectedElementEditor = <T extends {} | undefined = undefined>(
    styleProp: keyof CSSStyleDeclaration,
    ...rest: (T extends undefined ? [EditorHook<{}>] : [EditorHook<T>, T]) | []
  ) => {
    const useEditorHook = rest[0] || useBoundCSSLengthInput;
    const editorHookConfig = rest[1] || {};
    const onChange = (newValue: string, preview?: boolean) =>
      updateSelectedStyleGroup(
        [{ styleName: styleProp, styleValue: newValue }],
        preview
      );
    const label =
      StylePropNameMap[styleProp] || startCase(`${styleProp || ""}`);
    const initialValue =
      selectedElement?.inlineStyles[styleProp] ||
      selectedElement?.computedStyles[styleProp] ||
      "";

    const [selectedElementValue, renderValueInput] = useEditorHook({
      ...editorHookConfig,
      onChange,
      label,
      initialValue: `${initialValue}`,
    });
    return [
      selectedElementValue,
      (props?: React.HTMLAttributes<HTMLElement>) => renderValueInput(props),
    ] as const;
  };

  const useSelectedElementBreakdownEditor = (prop: "padding" | "margin") => {
    const [showBreakdown, setShowBreakdown] = useState(false);
    const renderExpand = () => (
      <button
        title={`Expand ${startCase(prop)} Options`}
        onClick={() => {
          setShowBreakdown(true);
          // todo only update styles if prop is defined for this style group
          updateSelectedStyleGroup([
            {
              styleName: prop,
              styleValue: null,
            },
            {
              styleName: `${prop}Top` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
            {
              styleName: `${prop}Bottom` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
            {
              styleName: `${prop}Left` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
            {
              styleName: `${prop}Right` as keyof CSSStyleDeclaration,
              styleValue: selectedElement!.computedStyles[prop],
            },
          ]);
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
          updateSelectedStyleGroup([
            {
              styleName: prop,
              // todo do an average or pick min/max
              styleValue: selectedElement!.computedStyles[
                `${prop}Top` as keyof CSSStyleDeclaration
              ] as string,
            },
            {
              styleName: `${prop}Top` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
            {
              styleName: `${prop}Bottom` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
            {
              styleName: `${prop}Left` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
            {
              styleName: `${prop}Right` as keyof CSSStyleDeclaration,
              styleValue: null,
            },
          ]);
        }}
      >
        <FontAwesomeIcon icon={faCompress} />
      </button>
    );
    const [
      selectedElementPropTop,
      renderPropTopInput,
    ] = useSelectedElementEditor(
      `${prop}Top` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );
    const [
      selectedElementPropBottom,
      renderPropBottomInput,
    ] = useSelectedElementEditor(
      `${prop}Bottom` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );
    const [
      selectedElementPropLeft,
      renderPropLeftInput,
    ] = useSelectedElementEditor(
      `${prop}Left` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );
    const [
      selectedElementPropRight,
      renderPropRightInput,
    ] = useSelectedElementEditor(
      `${prop}Right` as keyof CSSStyleDeclaration,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderCollapse(),
      }
    );

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
    }, [selectedElement?.lookupId]);

    const [, renderPropInput] = useSelectedElementEditor(
      prop,
      useCSSLengthInput,
      {
        bindInitialValue: true,
        endAddon: renderExpand(),
      }
    );
    return () =>
      showBreakdown ? (
        <>
          {renderPropTopInput()}
          {renderPropBottomInput()}
          {renderPropLeftInput()}
          {renderPropRightInput()}
        </>
      ) : (
        renderPropInput()
      );
  };

  const [, renderWidthInput] = useSelectedElementEditor("width");
  const [, renderHeightInput] = useSelectedElementEditor("height");
  const [
    selectedElementPosition,
    renderPositionInput,
  ] = useSelectedElementEditor("position", useSelectInput, {
    options: CSS_POSITION_OPTIONS,
  });
  const [, renderTopInput] = useSelectedElementEditor("top");
  const [, renderLeftInput] = useSelectedElementEditor("left");
  const [, renderBottomInput] = useSelectedElementEditor("bottom");
  const [, renderRightInput] = useSelectedElementEditor("right");
  const renderPaddingInput = useSelectedElementBreakdownEditor("padding");
  const renderMarginInput = useSelectedElementBreakdownEditor("margin");
  const [selectedElementDisplay, renderDisplayInput] = useSelectedElementEditor(
    "display",
    useSelectInput,
    {
      options: CSS_DISPLAY_OPTIONS,
    }
  );
  const [, renderBoxSizingInput] = useSelectedElementEditor(
    "boxSizing",
    useSelectInput,
    {
      options: CSS_BOX_SIZING_OPTIONS,
    }
  );
  const [, renderFlexDirectionInput] = useSelectedElementEditor(
    "flexDirection",
    useSelectInput,
    { options: CSS_FLEX_DIRECTION_OPTIONS }
  );
  const [, renderFlexWrapInput] = useSelectedElementEditor(
    "flexWrap",
    useSelectInput,
    { options: CSS_FLEX_WRAP_OPTIONS }
  );
  const [, renderAlignItemsInput] = useSelectedElementEditor(
    "alignItems",
    useSelectInput,
    { options: CSS_ALIGN_ITEMS_OPTIONS }
  );
  const [, renderJustifyContentInput] = useSelectedElementEditor(
    "justifyContent",
    useSelectInput,
    {
      options: CSS_JUSTIFY_CONTENT_OPTIONS,
    }
  );
  const [, renderOpacityInput] = useSelectedElementEditor(
    "opacity",
    useBoundTextInput
  );
  const [, renderBorderRadiusInput] = useSelectedElementEditor("borderRadius");
  const [, renderBackgroundColorInput] = useSelectedElementEditor(
    "backgroundColor",
    useColorPicker
  );

  const [
    selectedElementBackgroundImage,
    renderBackgroundImageInput,
  ] = useSelectedElementImageEditor("backgroundImage");

  const [, renderBackgroundSizeInput] = useSelectedElementEditor(
    "backgroundSize",
    useAutocomplete,
    {
      options: CSS_BACKGROUND_SIZE_OPTIONS,
      freeSolo: true,
      widePopper: true,
    }
  );

  const [, renderColorInput] = useSelectedElementEditor(
    "color",
    useColorPicker
  );
  const [, renderTextSizeInput] = useSelectedElementEditor("fontSize");
  const [, renderTextWeightInput] = useSelectedElementEditor(
    "fontWeight",
    useSelectInput,
    { options: CSS_FONT_WEIGHT_OPTIONS }
  );
  const [, renderTextFamilyInput] = useSelectedElementEditor(
    "fontFamily",
    useAutocomplete,
    {
      options: CSS_FONT_FAMILY_OPTIONS,
      freeSolo: true,
      widePopper: true,
    }
  );
  const [, renderTextAlignInput] = useSelectedElementEditor(
    "textAlign",
    useSelectInput,
    { options: CSS_TEXT_ALIGN_OPTIONS }
  );
  // todo support multiple selection
  const [, renderTextDecorationLineInput] = useSelectedElementEditor(
    "textDecorationLine",
    useSelectInput,
    {
      options: CSS_TEXT_DECORATION_LINE_OPTIONS,
    }
  );

  const [, renderCursorInput] = useSelectedElementEditor(
    "cursor",
    useSelectInput,
    { options: CSS_CURSOR_OPTIONS }
  );

  const renderAnimationPanel = () => {
    if (!project?.config.isPackageInstalled("framer-motion")) {
      return (
        <>
          <div className="text-center">Framer Motion is not installed</div>
          <button
            className="btn mt-2 w-full"
            onClick={() => installPackages("framer-motion")}
          >
            Install
          </button>
        </>
      );
    }
    const { componentName } = selectedElement?.sourceMetadata || {};
    if (!componentName?.startsWith("motion.")) {
      // todo support more elements for animation conversion
      if (["div", "a", "button", "span"].includes(componentName || "")) {
        const enableAnimation = () =>
          updateSelectedElement((editor, editContext) =>
            editor.updateElementComponent(editContext, {
              component: {
                import: {
                  path: "framer-motion",
                  namespace: "motion",
                  name: componentName || "",
                },
                name: componentName || "",
              },
            })
          );
        return (
          <button className="btn w-full" onClick={enableAnimation}>
            Enable Animation
          </button>
        );
      }
      // todo use a better method of checking whether motion is being used on the element
      return "Animation is not enabled for element";
    }
    return (
      <button className="btn w-full" onClick={() => AnimationEditorModal({})}>
        Edit Animation
      </button>
    );
  };

  return (
    <ReactPlaceholder
      className="p-8"
      type="text"
      color="#ffffff22"
      rows={5}
      ready={!!selectedElement}
    >
      <div data-tour="edit-element-tab" className="overflow-auto p-4">
        <Tour
          name="edit-element-tab"
          beaconStyle={{
            marginTop: 20,
            marginLeft: 70,
          }}
        >
          This is the element editor, here you can change various properties of
          elements, such as size and text color. Different elements can have
          different properties to edit. <br />
          Try changing the fill!
        </Tour>
        {renderSeparator("Style Group")}
        <div className="flex flex-row">
          {renderStyleGroupSelector({ className: "flex-1" })}
          <IconButton
            title="View in Code Editor"
            className="ml-3"
            icon={faCrosshairs}
            onClick={() =>
              selectedStyleGroup && openInEditor(selectedStyleGroup)
            }
          />
        </div>
        <Collapsible title="Layout">
          <div className="grid2x">
            {renderWidthInput()}
            {renderHeightInput()}
            {renderPositionInput()}
            {renderDisplayInput()}
            {renderBoxSizingInput()}
            {selectedElementPosition !== "static" && (
              <>
                {renderTopInput()}
                {renderLeftInput()}
                {renderBottomInput()}
                {renderRightInput()}
              </>
            )}
            {renderPaddingInput()}
            {renderMarginInput()}
            {renderBorderRadiusInput()}
          </div>
        </Collapsible>
        <Collapsible title="Colors">
          <div className="grid2x">
            {renderOpacityInput()}
            {renderBackgroundColorInput()}
            {renderBackgroundImageInput()}
            {selectedElementBackgroundImage !== "none" &&
              renderBackgroundSizeInput()}
          </div>
        </Collapsible>
        {/* todo border */}
        <Collapsible title="Text">
          <div className="grid2x">
            {allowTextEdit &&
              renderTextContentInput({
                className: "col-span-2",
                autoFocus: true,
                multiline: true,
              })}
            {renderColorInput()}
            {renderTextSizeInput()}
            {renderTextWeightInput()}
            {renderTextFamilyInput()}
            {selectedElementDisplay !== "flex" && renderTextAlignInput()}
            {renderTextDecorationLineInput()}
          </div>
        </Collapsible>
        {selectedElementDisplay === "flex" && (
          <>
            <Collapsible title="Content">
              <div className="grid2x">
                {renderFlexDirectionInput()}
                {renderFlexWrapInput()}
                {renderAlignItemsInput()}
                {renderJustifyContentInput()}
              </div>
            </Collapsible>
          </>
        )}
        <Collapsible title="Animation">{renderAnimationPanel()}</Collapsible>
        <Collapsible title="Extras" defaultCollapsed>
          <div className="grid2x">
            {renderCursorInput()}
            {renderIDInput()}
            {/* this check also applies to router links as those render as a */}
            {selectedElement?.element.tagName.toLowerCase() === "a" &&
              renderLinkTargetInput({ className: "col-span-2" })}
          </div>
        </Collapsible>
      </div>
    </ReactPlaceholder>
  );
};