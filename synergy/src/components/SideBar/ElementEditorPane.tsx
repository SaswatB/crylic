import React, { FunctionComponent, useCallback, useMemo } from "react";
import ReactPlaceholder from "react-placeholder";

import { useObservable } from "../../hooks/useObservable";
import { useService } from "../../hooks/useService";
import {
  ElementEditorFieldProps,
  ElementEditorSection,
} from "../../lib/elementEditors/ElementEditor";
import { renderSeparator } from "../../lib/render-utils";
import { ElementEditorService } from "../../services/ElementEditorService";
import { SelectService } from "../../services/SelectService";
import { Collapsible } from "../Collapsible";
import { Tour } from "../Tour/Tour";

export const ElementEditorPane: FunctionComponent = () => {
  const selectService = useService(SelectService);
  const elementEditorService = useService(ElementEditorService);
  const { selectedElement, editor: elementEditor } =
    useObservable(elementEditorService.selectedElementWithEditor$) || {};

  const onChangeStyleGroup: ElementEditorFieldProps["onChangeStyleGroup"] =
    useMemo(
      () => selectService.updateSelectedStyleGroup.bind(selectService),
      [selectService]
    );

  const onChangeAttributes: ElementEditorFieldProps["onChangeAttributes"] =
    useCallback(
      (attr) =>
        selectService.updateSelectedElement((editor, editContext) =>
          editor.updateElementAttributes(editContext, attr)
        ),
      [selectService]
    );

  const onChangeComponent: ElementEditorFieldProps["onChangeComponent"] =
    useCallback(
      (component) =>
        selectService.updateSelectedElement((editor, editContext) =>
          editor.updateElementComponent(editContext, component)
        ),
      [selectService]
    );

  const context = useMemo<ElementEditorFieldProps>(
    () => ({
      selectedElement: selectedElement!, // this will be defined whenever context gets used
      onChangeStyleGroup,
      onChangeAttributes,
      onChangeComponent,
    }),
    [onChangeAttributes, onChangeComponent, onChangeStyleGroup, selectedElement]
  );

  const sections = useMemo(
    () =>
      elementEditor?.getEditorSections().filter((s) => s.fields.length !== 0),
    [elementEditor]
  );

  const renderSection = useCallback(
    (section: ElementEditorSection, index: number) => {
      if (section.shouldHide?.(context)) return null;

      const renderedFields = section.fields.map(
        ({ component: Component, props }, i) => (
          <Component key={i} {...context} {...props} />
        )
      );

      if (section.collapsible === false) {
        return (
          <React.Fragment key={index}>
            {renderSeparator(section.name)}
            <div className="flex flex-row">{renderedFields}</div>
          </React.Fragment>
        );
      }

      return (
        <Collapsible
          key={index}
          title={section.name}
          defaultCollapsed={section.defaultCollapsed}
        >
          <div className={section.grid === false ? "" : "grid2x"}>
            {renderedFields}
          </div>
        </Collapsible>
      );
    },
    [context]
  );

  return (
    <ReactPlaceholder
      className="p-8"
      type="text"
      color="#ffffff22"
      rows={5}
      ready={!!sections?.length}
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
        {sections?.map((section, i) => renderSection(section, i))}
      </div>
    </ReactPlaceholder>
  );
};
