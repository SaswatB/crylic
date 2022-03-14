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
export type Styles = { [P in StyleKeys]?: string | null };

export interface CustomComponentDefinition {
  name: string;
  import: ImportDefinition;
  // defaultChildren?: ComponentDefinition[]; // todo implement
}

export interface ImportDefinition {
  path: string; // absolute path or node module, todo support path relative to project root
  namespace?: string;
  name: string;
  isDefault?: boolean;
  preferredAlias?: string;
  skipIdentifier?: boolean; // for side effect imports, like style sheets
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
