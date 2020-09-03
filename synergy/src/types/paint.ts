// import { ViewContext } from "../components/ComponentView/CompilerComponentView";
import {
  EditContext,
  ElementASTEditor,
  StyleGroup,
} from "../lib/ast/editors/ASTEditor";
import { Project } from "../lib/project/Project";

// todo use a better type
export type PackageJson = any;

export type PackageInstaller<
  T extends string | undefined = string | undefined
> = (packageName: T, devDep?: boolean) => void;

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

// export interface SelectedElement {
//   renderId: string;
//   lookupId: string;
//   element: HTMLElement;
//   elements: HTMLElement[];
//   styleGroups: StyleGroup[];
//   computedStyles: CSSStyleDeclaration;
//   inlineStyles: CSSStyleDeclaration;

//   sourceMetadata: SourceMetadata | undefined;
//   viewContext: ViewContext | undefined;
// }

export type UpdateSelectedElement = <T extends {}>(
  apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T
) => void;

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
    namespace?: string;
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
  installed: (project: Project) => boolean;
  install: (project: Project, installPackage: PackageInstaller<string>) => void;
  components: CustomComponentDefinition[];
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Mutable<U>[]
    : Mutable<T[P]>;
};
