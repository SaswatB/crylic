import { ReactNode } from "react";

import { PortablePath } from "../lib/project/PortablePath";
import { Project } from "../lib/project/Project";
import { ReactFiber, ReactFiberRoot } from "./react-devtools";

// todo use a better type
export type PackageJson = any;

export type PackageInstaller<
  T extends string | undefined = string | undefined
> = (packageName: T, devDep?: boolean) => void;

export interface EditEntry {
  codeId: string;
}

export enum OutlineElementType {
  Frame,
  Element,
}

export interface OutlineElement {
  id: string;
  tag: string;
  type: OutlineElementType;
  renderId: string;
  lookupId: string;
  lookupIdIndex: number;
  codeId: string;
  element: HTMLElement | undefined;
  closestElements: HTMLElement[];
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

// https://github.com/Microsoft/TypeScript/issues/27024#issuecomment-421529650
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B;

export type StyleKeys<
  T extends keyof CSSStyleDeclaration = keyof CSSStyleDeclaration
> =
  // filter out symbol keys
  T extends string
    ? // filter out readonly properties
      IfEquals<
        Pick<CSSStyleDeclaration, T>,
        { -readonly [Q in T]: CSSStyleDeclaration[T] },
        // filter out keys that refer to functions
        CSSStyleDeclaration[T] extends Function ? never : T,
        never
      >
    : never;
export type Styles<T = string> = { [P in StyleKeys]?: T | null };

export interface ImportedComponentDefinition {
  name: string;
  import: ImportDefinition;
}

export interface ImportDefinition {
  path: PortablePath | string; // absolute path or node module, todo support path relative to project root
  namespace?: string;
  name: string;
  isDefault?: boolean;
  preferredAlias?: string;
  skipIdentifier?: boolean; // for side effect imports, like style sheets
}

export interface StyledComponentDefinition {
  name: string;
  base: {
    // todo support other base types
    type: ComponentDefinitionType.HTMLElement;
    tag: keyof HTMLElementTagNameMap;
  };
}

export enum ComponentDefinitionType {
  HTMLElement,
  ImportedElement,
  StyledElement,
}

export type ComponentDefinition = (
  | {
      type: ComponentDefinitionType.HTMLElement;
      tag: keyof HTMLElementTagNameMap;
    }
  | {
      type: ComponentDefinitionType.ImportedElement;
      component: ImportedComponentDefinition;
    }
  | {
      type: ComponentDefinitionType.StyledElement;
      component: StyledComponentDefinition;
      defaultStyles?: string;
    }
) & {
  display: {
    id: string;
    name: string;
    icon?: () => ReactNode;
  };
  // match: (element: SelectedElement) => boolean; // todo implement
  defaultAttributes?: Record<string, unknown>;
  // defaultChildren?: ComponentDefinition[]; // todo implement
};

export interface CustomComponentConfig {
  name: string;
  installed: (project: Project) => boolean;
  install: (project: Project, installPackage: PackageInstaller<string>) => void;
  components: ComponentDefinition[];
  adderLayout?: {
    name: string;
    components: string[]; // display.id
  }[];
}

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U>
    ? Mutable<U>[]
    : Mutable<T[P]>;
};

export enum ComponentViewZoomAction {
  RESET = "reset",
  ZOOM_IN = "zoomin",
  ZOOM_OUT = "zoomout",
}

export interface ReactMetadata {
  fiberRoot: ReactFiberRoot;
  fiberComponentRoot: ReactFiber;
}

export type ViewContext = {
  iframe: HTMLIFrameElement;

  getRootElement(): HTMLBodyElement | undefined;
  getElementsAtPoint: (x: number, y: number) => HTMLElement[];
  getElementsByLookupId: (lookupId: string) => HTMLElement[];
  // cleared on next compile
  addTempStyles: (
    lookupId: string,
    styles: Styles,
    persistRender: boolean
  ) => void;
};

export interface FrameSettings {
  width: number;
  height: number;
  backgroundColor: string;
}
