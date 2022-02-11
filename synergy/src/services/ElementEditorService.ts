import { map } from "rxjs/operators";
import { singleton } from "tsyringe";

import { ElementEditor } from "../lib/elementEditors/ElementEditor";
import { HtmlElementEditor } from "../lib/elementEditors/HtmlElementEditor";
import { SelectedElement } from "../types/selected-element";
import { SelectService } from "./SelectService";

@singleton()
export class ElementEditorService {
  public selectedElementWithEditor$ = this.selectService.selectedElement$.pipe(
    map((selectedElement) => ({
      selectedElement,
      editor:
        selectedElement && this.getEditorForSelectedElement(selectedElement),
    }))
  );

  private elementEditors: ElementEditor[] = [new HtmlElementEditor()];

  constructor(private selectService: SelectService) {}

  protected getEditorForSelectedElement(
    selectedElement: SelectedElement
  ): ElementEditor | undefined {
    const editors = this.elementEditors.map((editor) => ({
      editor,
      priority: editor.canApply(selectedElement),
    }));
    editors.sort((a, b) => b.priority - a.priority);
    return (editors[0]?.priority || 0) > 0 ? editors[0]?.editor : undefined;
  }
}
