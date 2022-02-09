import React, { FunctionComponent } from "react";
import { distinctUntilChanged, map } from "rxjs/operators";

import { useMemoObservable, useObservable } from "../../hooks/useObservable";
import { useService } from "../../hooks/useService";
import { renderSeparator } from "../../lib/render-utils";
import { getElementUniqueId } from "../../lib/utils";
import { useProject } from "../../services/ProjectService";
import { SelectService } from "../../services/SelectService";
import { Tour } from "../Tour/Tour";
import { OutlinePaneEntry } from "./OutlinePaneEntry";

export const OutlinePane: FunctionComponent = () => {
  const project = useProject();
  const selectService = useService(SelectService);
  const selectedElementUniqueId = useMemoObservable(
    () =>
      selectService.selectedElement$.pipe(
        map((selectedElement) =>
          selectedElement
            ? `${getElementUniqueId(selectedElement.element)}`
            : undefined
        ),
        distinctUntilChanged()
      ),
    [selectService]
  );

  const renderEntries = useObservable(project?.renderEntries$);
  return (
    <>
      {(renderEntries?.length || 0) > 0 && (
        <Tour
          name="outline-tab"
          beaconStyle={{
            marginTop: 20,
            marginLeft: 43,
          }}
        >
          This is the outline view, here you can see all the elements in your
          component. <br />
          Click on one to edit it!
        </Tour>
      )}
      <div
        data-tour="outline-tab"
        className="flex-1 overflow-auto"
        style={{ minHeight: 200 }}
      >
        {renderSeparator("Outline")}
        {renderEntries.map((renderEntry) => (
          <OutlinePaneEntry
            key={renderEntry.id}
            renderEntry={renderEntry}
            selectedElementUniqueId={selectedElementUniqueId}
          />
        ))}
      </div>
    </>
  );
};
