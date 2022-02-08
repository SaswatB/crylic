import { debounce } from "lodash";
import { BehaviorSubject, of } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { singleton } from "tsyringe";

import { SelectMode } from "../constants";
import {
  updateElementHelper,
  updateStyleGroupHelper,
} from "../lib/ast/code-edit-helpers";
import {
  EditContext,
  ElementASTEditor,
  StyleGroup,
} from "../lib/ast/editors/ASTEditor";
import { ASTType } from "../lib/ast/types";
import { ltTakeNext } from "../lib/utils";
import { RenderEntry, SelectedElement, Styles } from "../types/paint";
import { CompilerContextService } from "./CompilerContextService";
import { ProjectService } from "./ProjectService";

@singleton()
export class SelectService {
  public readonly selectMode$ = new BehaviorSubject<SelectMode | undefined>(
    undefined
  );
  public readonly selectedElement$ = new BehaviorSubject<
    SelectedElement | undefined
  >(undefined);
  public readonly selectedStyleGroup$ = new BehaviorSubject<
    StyleGroup | undefined
  >(undefined);

  constructor(
    private projectService: ProjectService,
    private compilerContextService: CompilerContextService
  ) {
    this.selectedElement$.subscribe((selectedElement) => {
      (window as any).selectedElement = selectedElement; // for debugging purposes

      this.validateSelectedElement();

      // set the observer to detect changes to the selected element's parent
      const parentElement = selectedElement?.element.parentElement;
      if (parentElement) {
        this.selectedElementParentObserver.disconnect();
        this.selectedElementParentObserver.observe(parentElement, {
          subtree: false,
          childList: true,
        });
      }
    });

    // clear the selected element if its frame was removed
    this.projectService.project$
      .pipe(
        mergeMap((project) => project?.renderEntries$ || of<RenderEntry[]>([]))
      )
      .subscribe((renderEntries) => {
        const selectedElementRenderId = this.selectedElement$.getValue()
          ?.renderId;
        if (
          selectedElementRenderId !== undefined &&
          !renderEntries.find((e) => e.id === selectedElementRenderId)
        ) {
          this.clearSelectedElement();
        }
      });

    // clear the selected element if the select mode was cleared
    this.selectMode$.subscribe(
      (selectMode) => selectMode === undefined && this.clearSelectedElement()
    );
  }

  private get project() {
    return this.projectService.project$.getValue();
  }

  private badSelectedElementRetryCounter = 0;
  private selectedElementParentObserver = new MutationObserver(
    debounce(() => this.validateSelectedElement(), 100, { maxWait: 100 })
  );
  /**
   * There are instances where selected element will have its underlying dom element replaced
   * so to try and handle such cases, this attempts to reselect the selected element if the parent element is missing
   */
  private validateSelectedElement() {
    const selectedElement = this.selectedElement$.getValue();
    if (selectedElement && !selectedElement.element.parentElement) {
      if (this.badSelectedElementRetryCounter === 0) {
        this.badSelectedElementRetryCounter++;
        this.selectElement(selectedElement.renderId, selectedElement);
      }
    } else {
      this.badSelectedElementRetryCounter = 0;
    }
  }

  public setSelectMode(selectMode: SelectMode | undefined) {
    this.selectMode$.next(selectMode);
  }

  public setSelectedStyleGroup(selectedStyleGroup: StyleGroup | undefined) {
    this.selectedStyleGroup$.next(selectedStyleGroup);
  }

  public async selectElement(
    renderId: string,
    selector:
      | { htmlElement: HTMLElement; lookupId?: undefined; index?: undefined }
      // index: index of the primary element to select in the view
      | { htmlElement?: undefined; lookupId: string; index: number }
  ) {
    const { getElementsByLookupId } =
      this.compilerContextService.getViewContext(renderId) || {};

    // resolve lookupId
    let lookupId;
    if (selector.htmlElement) {
      lookupId = this.project?.primaryElementEditor.getLookupIdFromHTMLElement(
        selector.htmlElement
      );
      if (!lookupId) {
        console.log("dropping element select, no lookup id");
        return;
      }
    } else {
      lookupId = selector.lookupId;
    }

    const componentElements = getElementsByLookupId?.(lookupId);
    if (!componentElements?.length) {
      console.log("dropping element select, no elements");
      return;
    }

    // resolve index
    let index;
    if (selector.htmlElement) {
      index = Math.max(componentElements.indexOf(selector.htmlElement), 0);
    } else {
      index = selector.index;
    }

    // resolve code entry
    const codeId = this.project?.primaryElementEditor.getCodeIdFromLookupId(
      lookupId
    );
    if (!codeId) {
      console.log("dropping element select, no code id");
      return;
    }
    const codeEntry = this.project?.getCodeEntryValue(codeId);
    if (!codeEntry) {
      console.log("dropping element select, no code entry");
      return;
    }

    if (!componentElements[index]) index = 0;
    const primaryElement = componentElements[index]!;

    // resolve style groups
    const styleGroups: StyleGroup[] = [];
    this.project?.editorEntries.forEach(({ editor }) => {
      styleGroups.push(...editor.getStyleGroupsFromHTMLElement(primaryElement));
    });

    // save collected info
    this.selectedElement$.next({
      renderId,
      lookupId,
      index,
      sourceMetadata: this.project!.primaryElementEditor.getSourceMetaDataFromLookupId(
        { ast: (await codeEntry.getLatestAst()) as ASTType, codeEntry },
        lookupId
      ),
      viewContext: this.compilerContextService.getViewContext(renderId),
      element: primaryElement,
      elements: componentElements,
      styleGroups,
      computedStyles: window.getComputedStyle(primaryElement),
      inlineStyles: primaryElement.style,
    });
    this.setSelectedStyleGroup(styleGroups[0]);
  }

  public async updateSelectedElement<T extends ASTType>(
    apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T
  ) {
    const selectedElement = this.selectedElement$.getValue();
    if (!selectedElement) return;

    await updateElementHelper(this.project!, selectedElement, apply, {
      // refresh the selected element after compile to get the new ast metadata
      renderId: selectedElement.renderId,
      addCompileTask: this.compilerContextService.addCompileTask.bind(
        this.compilerContextService
      ),
      selectElement: this.selectElement.bind(this),
    });
  }

  public async updateSelectedStyleGroup(styles: Styles, preview?: boolean) {
    const selectedElement = this.selectedElement$.getValue();
    if (!selectedElement) return;

    this.compilerContextService
      .getViewContext(selectedElement.renderId)
      ?.addTempStyles(selectedElement.lookupId, styles, !preview);

    // preview is a flag used to quickly show updates in the dom
    // there shouldn't be any expensive calculations done when it's on
    // such as changing state or parsing ast
    if (preview) return;

    const selectedStyleGroup = this.selectedStyleGroup$.getValue();
    if (!selectedStyleGroup) return;

    await updateStyleGroupHelper(
      this.project!,
      selectedStyleGroup,
      (editor, editContext) => editor.applyStyles(editContext, styles)
    );
  }

  public async deleteSelectedElement() {
    const selectedElement = this.selectedElement$.getValue();
    if (!selectedElement) return;

    // prevent an element from being deleted if its parent is the html template root
    if (
      selectedElement.element.parentElement?.id ===
      this.projectService.project$.getValue()?.config.getHtmlTemplateSelector()
    )
      throw new Error("Unable to delete selected element, no parent found");

    await updateElementHelper(
      this.project!,
      selectedElement,
      (editor, editContext) => editor.deleteElement(editContext)
    );

    this.clearSelectedElement();
  }

  public clearSelectedElement() {
    this.selectedElement$.next(undefined);
    this.setSelectedStyleGroup(undefined);
  }
}
