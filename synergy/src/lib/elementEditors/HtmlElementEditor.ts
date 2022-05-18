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
} from "../../components/SideBar/css-options";
import {
  getSelectedElementStyleValue,
  ifSelectedElementTarget_Component,
  isSelectedElementTarget_Component,
  SelectedElement,
} from "../../types/selected-element";
import { AnimationFE } from "./defaultFields/AnimationFE";
import { createBoundTextAttrFE } from "./defaultFields/AttributeFEs";
import { createConditionalFE } from "./defaultFields/ConditionalFE";
import { DeleteFE } from "./defaultFields/DeleteFE";
import { ImageSelectorFE } from "./defaultFields/ImageSelectorFE";
import {
  createAutocompleteSGFE,
  createBoundColorPickerSGFE,
  createBoundCSSLengthSGFE,
  createBoundTextSGFE,
  createBreakdownSGFE,
  createSelectSGFE,
} from "./defaultFields/StyleGroupFEs";
import { StyleGroupSelectorFE } from "./defaultFields/StyleGroupSelectorFE";
import { TextContentFE } from "./defaultFields/TextContentFE";
import {
  createElementEditorField,
  ElementEditor,
  ElementEditorSection,
} from "./ElementEditor";

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

// don't allow text edits on elements with non-text nodes
// TODO: allow partial edits
// allow editing elements with text or elements that are supposed to have text
function allowTextEdit(selectedElement: SelectedElement) {
  if (!isSelectedElementTarget_Component(selectedElement)) return false;
  const { element } = selectedElement.target;
  return (
    !Array.from(element.childNodes || []).find(
      (node) => node.nodeType !== Node.TEXT_NODE
    ) &&
    (TEXT_TAGS.includes(element.tagName.toLowerCase() || "") ||
      (element.textContent?.trim().length ?? 0) > 0)
  );
}

export class HtmlElementEditor implements ElementEditor {
  canApply(selectedElement: SelectedElement): number {
    return isSelectedElementTarget_Component(selectedElement) ? 1 : 0;
  }

  getEditorSections(): ElementEditorSection[] {
    return [
      {
        name: "Style Group",
        fields: [createElementEditorField(StyleGroupSelectorFE)],
        collapsible: false,
        grid: false,
      },
      {
        name: "Layout",
        fields: [
          createBoundCSSLengthSGFE("width"),
          createBoundCSSLengthSGFE("height"),
          createSelectSGFE("position", CSS_POSITION_OPTIONS),
          createSelectSGFE("display", CSS_DISPLAY_OPTIONS),
          createSelectSGFE("boxSizing", CSS_BOX_SIZING_OPTIONS),
          ...[
            createBoundCSSLengthSGFE("top"),
            createBoundCSSLengthSGFE("left"),
            createBoundCSSLengthSGFE("bottom"),
            createBoundCSSLengthSGFE("right"),
          ].map((e) =>
            createConditionalFE(
              e,
              ({ selectedElement }) =>
                isSelectedElementTarget_Component(selectedElement) &&
                getSelectedElementStyleValue(selectedElement, "position") !==
                  "static"
            )
          ),
          createBreakdownSGFE("padding"),
          createBreakdownSGFE("margin"),
          // todo breakdown?
          createBoundCSSLengthSGFE("borderRadius"),
        ],
      },
      {
        name: "Colors",
        defaultCollapsed: true,
        fields: [
          createBoundTextSGFE("opacity"),
          createBoundColorPickerSGFE("backgroundColor"),
          createElementEditorField(ImageSelectorFE, {
            imageProp: "backgroundImage" as const,
          }),
          createConditionalFE(
            createAutocompleteSGFE(
              "backgroundSize",
              CSS_BACKGROUND_SIZE_OPTIONS
            ),
            ({ selectedElement }) =>
              isSelectedElementTarget_Component(selectedElement) &&
              getSelectedElementStyleValue(
                selectedElement,
                "backgroundImage"
              ) !== "none"
          ),
        ],
      },
      // todo border
      {
        name: "Text",
        defaultCollapsed: true, // todo don't collapse this by default for text elements
        fields: [
          createConditionalFE(
            createElementEditorField(TextContentFE),
            ({ selectedElement }) => allowTextEdit(selectedElement)
          ),
          createBoundColorPickerSGFE("color"),
          createBoundCSSLengthSGFE("fontSize"),
          createSelectSGFE("fontWeight", CSS_FONT_WEIGHT_OPTIONS),
          createAutocompleteSGFE("fontFamily", CSS_FONT_FAMILY_OPTIONS),
          createConditionalFE(
            createSelectSGFE("textAlign", CSS_TEXT_ALIGN_OPTIONS),
            ({ selectedElement }) =>
              isSelectedElementTarget_Component(selectedElement) &&
              getSelectedElementStyleValue(selectedElement, "display") !==
                "flex"
          ),
          createSelectSGFE(
            "textDecorationLine",
            CSS_TEXT_DECORATION_LINE_OPTIONS
          ),
        ],
      },
      {
        name: "Content",
        shouldHide: ({ selectedElement }) =>
          isSelectedElementTarget_Component(selectedElement) &&
          getSelectedElementStyleValue(selectedElement, "display") !== "flex",
        defaultCollapsed: true,
        fields: [
          createSelectSGFE("flexDirection", CSS_FLEX_DIRECTION_OPTIONS),
          createSelectSGFE("flexWrap", CSS_FLEX_WRAP_OPTIONS),
          createSelectSGFE("alignItems", CSS_ALIGN_ITEMS_OPTIONS),
          createSelectSGFE("justifyContent", CSS_JUSTIFY_CONTENT_OPTIONS),
        ],
      },
      {
        name: "Animation",
        defaultCollapsed: true,
        fields: [createElementEditorField(AnimationFE)],
        grid: false,
      },
      {
        name: "Extras",
        defaultCollapsed: true,
        fields: [
          createSelectSGFE("cursor", CSS_CURSOR_OPTIONS),
          createBoundTextAttrFE("id"),
          createConditionalFE(
            createBoundTextAttrFE("href"),
            ({ selectedElement }) =>
              ifSelectedElementTarget_Component(
                selectedElement
              )?.target.element.tagName.toLowerCase() === "a"
          ),
          createElementEditorField(DeleteFE),
        ],
      },
    ];
  }
}
