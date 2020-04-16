export interface CodeEntry {
  id: string;
  filePath: string;
  code: string;
}

export interface SelectedElement {
  lookupId: string;
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
}

export interface OutlineElement {
  tag: string;
  lookupId: string;
  children: OutlineElement[];
}
