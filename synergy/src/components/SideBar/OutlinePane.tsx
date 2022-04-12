import React from "react";

import { useObservable } from "../../hooks/useObservable";
import { renderSeparator } from "../../lib/render-utils";
import { useProject } from "../../services/ProjectService";
import { Tour } from "../Tour/Tour";
import { OutlinePaneEntry } from "./OutlinePaneEntry";

export const OutlinePane = ({
  openUrl,
}: {
  openUrl: (url: string) => void;
}) => {
  const project = useProject();
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
        className="flex-1 pr-4 overflow-auto"
        style={{ minHeight: 200 }}
      >
        {renderSeparator("Outline")}
        {renderEntries.map((renderEntry) => (
          <OutlinePaneEntry
            key={renderEntry.id}
            renderEntry={renderEntry}
            openUrl={openUrl}
          />
        ))}
      </div>
    </>
  );
};
