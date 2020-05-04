import React, { FunctionComponent, ReactNode, useEffect } from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { usePrevious } from "../../hooks/usePrevious";

interface Tab {
  key: string;
  name: ReactNode;
  title: string;
  render: () => ReactNode;
  onClose: () => void;
}

interface Props {
  tabs?: (Tab | false)[];
  activeTab: number;
  onChange: (newTab: number) => void;
}
export const EditorTabs: FunctionComponent<Props> = ({
  tabs,
  activeTab,
  onChange,
}) => {
  const usableTabs = tabs?.filter((tab): tab is Tab => !!tab) || [];

  const previousUsableTabsLength = usePrevious(usableTabs.length);
  useEffect(() => {
    if (
      ((usableTabs.length || 0) <= activeTab && activeTab !== 0) ||
      previousUsableTabsLength < usableTabs.length
    ) {
      onChange((usableTabs.length || 1) - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableTabs.length]);

  return (
    <div
      className="editor-tabs flex flex-col h-full"
      style={{ width: "600px" }}
    >
      <div className="tabs flex flex-row overflow-x-auto">
        {usableTabs.map(({ key, name, title, onClose }, index) => (
          <button
            key={key}
            className="flex px-6 py-1 whitespace-no-wrap text-sm default-transition hover:bg-gray-700"
            style={
              (activeTab === index && { backgroundColor: "#373737" }) ||
              undefined
            }
            onClick={() => onChange(index)}
            title={title}
          >
            {name}
            <button className="ml-2" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </button>
        ))}
      </div>
      {usableTabs.map(({ key, render: renderTab }, index) => (
        <div
          key={key}
          className="min-h-full"
          style={{ display: activeTab === index ? undefined : "none" }}
        >
          {renderTab() || null}
        </div>
      ))}
    </div>
  );
};
