import { ComponentType } from "react";

import { ComponentDefinition, Styles } from "../../types/paint";
import { SelectedElement } from "../../types/selected-element";
import { StyleASTEditor } from "../ast/editors/ASTEditor";

export interface ElementEditorFieldProps {
  selectedElement: SelectedElement;

  onChangeStyleGroup: (styles: Styles, preview?: boolean) => Promise<void>;
  onChangeAttributes: (attr: Record<string, unknown>) => Promise<void>;
  onChangeComponent: (component: ComponentDefinition) => Promise<void>;
  openInEditor: (
    lookupId: string,
    editor: StyleASTEditor<any> | undefined
  ) => void;
}
export interface ElementEditorFieldEntry<T extends object = any> {
  component: ComponentType<T & ElementEditorFieldProps>;
  props: T;
}

export function createElementEditorField<
  T extends { [K in keyof T]: T[K] | undefined }
>(
  component: ComponentType<T & ElementEditorFieldProps>,
  props?: T | undefined
): ElementEditorFieldEntry<T>;
export function createElementEditorField<T extends {}>(
  component: ComponentType<T & ElementEditorFieldProps>,
  props: T extends { [K in keyof T]: T[K] | undefined } ? T | undefined : T
): ElementEditorFieldEntry<T> {
  return { component, props: (props || {}) as T };
}

export interface ElementEditorSection {
  name: string;
  fields: ElementEditorFieldEntry[];
  defaultCollapsed?: boolean;
}

export interface ElementEditor {
  /**
   * Whether the editor applies to the given selected element.
   * @returns 0 - editor does not apply, 1+ - editor applies with larger numbers representing higher priority.
   */
  canApply(selectedElement: SelectedElement): number;
  getEditorSections(selectedElement: SelectedElement): ElementEditorSection[];
}
