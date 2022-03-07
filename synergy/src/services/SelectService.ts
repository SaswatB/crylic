import { debounce, uniq } from "lodash";
import { BehaviorSubject, of, Subject } from "rxjs";
import { map } from "rxjs/operators";
import { singleton } from "tsyringe";

import { SelectMode, SelectModeType } from "../constants";
import {
  addElementHelper,
  updateElementHelper,
  updateStyleGroupHelper,
} from "../lib/ast/code-edit-helpers";
import {
  EditContext,
  ElementASTEditor,
  StyleGroup,
} from "../lib/ast/editors/ASTEditor";
import { ASTType } from "../lib/ast/types";
import { RenderEntry } from "../lib/project/RenderEntry";
import { eagerMap } from "../lib/rxjs/eagerMap";
import { sleep } from "../lib/utils";
import { OutlineElement, Styles } from "../types/paint";
import { SelectedElement } from "../types/selected-element";
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
  public readonly outlineHover$ = new BehaviorSubject<
    OutlineElement | undefined
  >(undefined);

  private readonly overlayWarningsCache = new WeakMap<Element, string[]>();

  constructor(private projectService: ProjectService) {
    this.selectedElement$.subscribe(async (selectedElement) => {
      (window as any).selectedElement = selectedElement; // for debugging purposes

      await this.validateSelectedElement();

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

    // refresh the selected element when the iframe reloads, if possible
    this.selectedElement$
      .pipe(
        eagerMap(
          (s) =>
            s?.renderEntry.viewReloaded$.pipe(map(() => s)) ||
            new Subject<SelectedElement>()
        )
      )
      .subscribe(async (selectedElement) => {
        let newSelectedComponent = undefined;
        for (let i = 0; i < 5 && !newSelectedComponent; i++) {
          newSelectedComponent = selectedElement.renderEntry?.viewContext$
            .getValue()
            ?.getElementsByLookupId(selectedElement.lookupId)[0];
          if (!newSelectedComponent) await sleep(100);
        }

        if (newSelectedComponent) {
          console.log(
            "setting selected element post-iframe reload",
            selectedElement.lookupId
          );
          void this.selectElement(selectedElement.renderEntry, selectedElement);
        } else {
          console.log(
            "unable to reselect selected element post-iframe reload",
            selectedElement.lookupId
          );
          this.clearSelectedElement();
        }
      });

    // clear the selected element if its frame was removed
    this.projectService.project$
      .pipe(
        eagerMap((project) => project?.renderEntries$ || of<RenderEntry[]>([]))
      )
      .subscribe((renderEntries) => {
        const selectedElementRenderId = this.selectedElement$.getValue()
          ?.renderEntry.id;
        if (
          selectedElementRenderId !== undefined &&
          !renderEntries.find((e) => e.id === selectedElementRenderId)
        ) {
          this.clearSelectedElement();
        }
      });

    // clear the selected element if the project was closed
    this.projectService.project$.subscribe((project) => {
      if (!project && this.selectedElement$.getValue())
        this.clearSelectedElement();
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
  private async validateSelectedElement() {
    const selectedElement = this.selectedElement$.getValue();
    if (selectedElement && !selectedElement.element.parentElement) {
      if (this.badSelectedElementRetryCounter === 0) {
        this.badSelectedElementRetryCounter++;
        await this.selectElement(selectedElement.renderEntry, selectedElement);
      }
    } else {
      this.badSelectedElementRetryCounter = 0;
    }
  }

  public setSelectMode(selectMode: SelectMode | undefined) {
    this.selectMode$.next(selectMode);
  }

  public async invokeSelectModeAction(
    renderEntry: RenderEntry,
    element: HTMLElement
  ) {
    const selectMode = this.selectMode$.getValue();
    switch (selectMode?.type) {
      default:
      case SelectModeType.SelectElement:
        console.log("setting selected from manual selection", element);
        await this.selectElement(renderEntry, {
          htmlElement: element,
        });
        break;
      case SelectModeType.AddElement:
        await addElementHelper(
          this.projectService.project$.getValue()!,
          element,
          selectMode,
          {
            renderEntry,
            selectElement: this.selectElement.bind(this),
          }
        );
        break;
    }

    if (selectMode) this.setSelectMode(undefined);
  }

  public setSelectedStyleGroup(selectedStyleGroup: StyleGroup | undefined) {
    this.selectedStyleGroup$.next(selectedStyleGroup);
  }

  public async selectElement(
    renderEntry: RenderEntry,
    selector:
      | { htmlElement: HTMLElement; lookupId?: undefined; index?: undefined }
      // index: index of the primary element to select in the view
      | { htmlElement?: undefined; lookupId: string; index: number }
  ) {
    const { getElementsByLookupId } = renderEntry.viewContext$.getValue() || {};

    // resolve lookupId
    let lookupId;
    if (selector.htmlElement) {
      lookupId = this.project?.primaryElementEditor.getLookupIdFromHTMLElement(
        selector.htmlElement
      );
      if (!lookupId) {
        console.log(
          "dropping element select, no lookup id",
          selector.htmlElement
        );
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

    // resolve styles
    const computedStyles = window.getComputedStyle(primaryElement);
    let overlayWarnings = this.overlayWarningsCache.get(primaryElement) || []; // todo this is a bit scary :/
    // add a temp size for 0 width/height elements
    // todo make this configurable
    if (computedStyles.width === "0px" || computedStyles.height === "0px") {
      console.log("selected element has zero size, adding temp style");
      if (computedStyles.width === "0px")
        overlayWarnings.push(
          "Element has no width by default and has been expanded"
        );
      if (computedStyles.height === "0px")
        overlayWarnings.push(
          "Element has no height by default and has been expanded"
        );
      setTimeout(
        () =>
          this.updateSelectedStyleGroup(
            {
              width: computedStyles.width === "0px" ? "100px" : undefined,
              height: computedStyles.height === "0px" ? "100px" : undefined,
            },
            true
          ),
        100
      );
      overlayWarnings = uniq(overlayWarnings);
      this.overlayWarningsCache.set(primaryElement, overlayWarnings);
    }

    // save collected info
    this.selectedElement$.next({
      renderEntry,
      lookupId,
      index,
      sourceMetadata: this.project!.primaryElementEditor.getSourceMetaDataFromLookupId(
        { ast: (await codeEntry.getLatestAst()) as ASTType, codeEntry },
        lookupId
      ),
      hasDomPassthrough: true,
      element: primaryElement,
      elements: componentElements,
      styleGroups,
      computedStyles,
      inlineStyles: primaryElement.style,
      overlayWarnings,
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
      renderEntry: selectedElement.renderEntry,
      selectElement: this.selectElement.bind(this),
    });
  }

  public async updateSelectedStyleGroup(styles: Styles, preview?: boolean) {
    const selectedElement = this.selectedElement$.getValue();
    if (!selectedElement) return;

    selectedElement.renderEntry.viewContext$
      .getValue()
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
