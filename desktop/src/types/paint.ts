import { StyleGroup } from "synergy/src/lib/ast/editors/ASTEditor";
import { SourceMetadata } from "synergy/src/types/paint";

import { ViewContext } from "../components/ComponentView/CompilerComponentView";

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
