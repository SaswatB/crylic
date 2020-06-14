import React, { FunctionComponent, ReactNode, useEffect, useRef } from "react";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

import { usePrevious } from "../../hooks/usePrevious";
import { IconButton } from "../IconButton";

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
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const usableTabs = tabs?.filter((tab): tab is Tab => !!tab) || [];

  const previousUsableTabsLength = usePrevious(usableTabs.length);
  useEffect(() => {
    if (
      ((usableTabs.length || 0) <= activeTab && activeTab !== 0) ||
      previousUsableTabsLength < usableTabs.length
    ) {
      // select last tab
      onChange((usableTabs.length || 1) - 1);
      // scroll to end of tab list
      if (tabScrollRef.current)
        tabScrollRef.current.scrollLeft = tabScrollRef.current.scrollWidth;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableTabs.length]);

  return (
    <div
      className="editor-tabs flex flex-col h-full"
      style={{ width: "600px" }}
    >
      <div ref={tabScrollRef} className="tabs flex flex-row overflow-x-auto">
        {usableTabs.map(({ key, name, title, onClose }, index) => (
          <div
            key={key}
            className="flex px-6 py-1 whitespace-no-wrap select-none cursor-pointer text-sm default-transition hover:bg-gray-700"
            style={
              (activeTab === index && { backgroundColor: "#373737" }) ||
              undefined
            }
            onClick={() => onChange(index)}
            title={title}
          >
            {name}
            <IconButton className="ml-2" icon={faTimes} onClick={onClose} />
          </div>
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
