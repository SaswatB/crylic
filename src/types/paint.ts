export interface CodeEntry {
  id: string;
  filePath: string;
  code: string;
}

export interface SelectedElement {
  lookUpId: string;
  computedStyles: CSSStyleDeclaration;
  inlineStyles: CSSStyleDeclaration;
}

export interface OutlineElement {
  tag: string;
  lookUpId: string;
  children: OutlineElement[];
}
