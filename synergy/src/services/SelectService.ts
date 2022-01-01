import { debounce } from "lodash";
import { BehaviorSubject } from "rxjs";
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
import { ltTakeNext, takeNext } from "../lib/utils";
import { SelectedElement, Styles } from "../types/paint";
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
        this.selectElement(selectedElement.renderId, selectedElement.lookupId);
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

  public async selectElement(renderId: string, lookupId: string) {
    const { getElementsByLookupId } =
      this.compilerContextService.getViewContext(renderId) || {};
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
    const componentElements = getElementsByLookupId?.(lookupId);
    if (!componentElements?.length) {
      console.log("dropping element select, no elements");
      return;
    }

    const styleGroups: StyleGroup[] = [];

    this.project?.editorEntries.forEach(({ editor }) => {
      styleGroups.push(
        ...editor.getStyleGroupsFromHTMLElement(componentElements[0]!)
      );
    });

    this.selectedElement$.next({
      renderId,
      lookupId,
      sourceMetadata: this.project!.primaryElementEditor.getSourceMetaDataFromLookupId(
        { ast: (await ltTakeNext(codeEntry.ast$)) as ASTType, codeEntry },
        lookupId
      ),
      viewContext: this.compilerContextService.getViewContext(renderId),
      element: componentElements[0]!,
      elements: componentElements,
      styleGroups,
      // todo properly support multiple elements instead of taking the first one
      computedStyles: window.getComputedStyle(componentElements[0]!),
      inlineStyles: componentElements[0]!.style,
    });
    this.setSelectedStyleGroup(styleGroups[0]);
  }

  public updateSelectedElement<T extends ASTType>(
    apply: (editor: ElementASTEditor<T>, editContext: EditContext<T>) => T
  ) {
    const selectedElement = this.selectedElement$.getValue();
    if (!selectedElement) return;

    updateElementHelper(this.project!, selectedElement, apply, {
      // refresh the selected element after compile to get the new ast metadata
      renderId: selectedElement.renderId,
      addCompileTask: this.compilerContextService.addCompileTask.bind(
        this.compilerContextService
      ),
      selectElement: this.selectElement.bind(this),
    });
  }

  public updateSelectedStyleGroup(styles: Styles, preview?: boolean) {
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

    updateStyleGroupHelper(
      this.project!,
      selectedStyleGroup,
      (editor, editContext) => editor.applyStyles(editContext, styles)
    );
  }

  public clearSelectedElement() {
    this.selectedElement$.next(undefined);
    this.setSelectedStyleGroup(undefined);
  }
}
