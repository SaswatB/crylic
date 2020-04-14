import React, {
  FunctionComponent,
  useState,
  ReactNode,
  useEffect,
} from "react";
import "../index.scss";

interface Tab {
  name: ReactNode;
  render: () => ReactNode;
}
export const Tabs: FunctionComponent<{ tabs?: (Tab | false)[] }> = ({
  tabs,
}) => {
  const usableTabs = tabs?.filter((tab): tab is Tab => !!tab) || [];
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    if ((usableTabs.length || 0) <= activeTab && activeTab !== 0) {
      setActiveTab((usableTabs.length || 1) - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableTabs.length]);
  return (
    <div className="flex flex-col h-full">
      <div className="btngrp-h mb-5">
        {usableTabs.map(({ name }, index) => (
          <button
            key={index}
            className="btn px-6"
            style={
              (activeTab === index && { backgroundColor: "#7895c1" }) || undefined
            }
            onClick={() => setActiveTab(index)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="overflow-y-auto">{usableTabs[activeTab]?.render() || null}</div>
    </div>
  );
};
