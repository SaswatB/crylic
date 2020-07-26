import { ViewContext } from "../components/CompilerComponentView";
import { StyleGroup } from "../utils/ast/editors/ASTEditor";

// todo use a better type
export type PackageJson = any;

export interface CodeEntry {
  id: string;
  filePath: string;
  code: string | undefined;
  codeRevisionId: number;

  // metadata generated from code
  ast?: any;
  codeWithLookupData?: string;
  isRenderable?: boolean;
  isEditable?: boolean;
  isBootstrap?: boolean;
  exportName?: string;
  exportIsDefault?: boolean;
}

export interface EditEntry {
  codeId: string;
}

export interface RenderEntry {
  id: string;
  name: string;
  codeId: string;
  publish?: boolean;
  route?: string;
}

export interface SourceMetadata {
  componentName: string;
  directProps: Record<string, unknown>;
}

export interface SelectedElement {
  renderId: string;
  lookupId: string;
  element: HTMLElement;
  elements: HTMLElement[];
  styleGroups: StyleGroup[];
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;

  sourceMetadata: SourceMetadata | undefined;
  viewContext: ViewContext | undefined;
}

export interface OutlineElement {
  tag: string;
  renderId: string;
  lookupId: string;
  element: HTMLElement | undefined;
  children: OutlineElement[];
}

export type onMoveResizeCallback = (
  deltaX: number | undefined,
  totalDeltaX: number | undefined,
  deltaY: number | undefined,
  totalDeltaY: number | undefined,
  width: string | undefined,
  height: string | undefined,
  preview?: boolean
) => void;

export type Styles = {
  styleName: keyof CSSStyleDeclaration;
  styleValue: string | null;
}[];

export interface CustomComponentDefinition {
  name: string;
  import: {
    path: string; // absolute path or node module, todo support path relative to project root
    name?: string; // defaults to name
    isDefault?: boolean;
    preferredAlias?: string;
  };
  // defaultChildren?: ComponentDefinition[]; // todo implement
}

export type ComponentDefinition = (
  | {
      isHTMLElement: true;
      tag: keyof HTMLElementTagNameMap;
    }
  | {
      isHTMLElement?: false;
      component: CustomComponentDefinition;
    }
) & {
  attributes?: Record<string, unknown>;
};

export interface CustomComponentConfig {
  name: string;
  components: CustomComponentDefinition[];
}
