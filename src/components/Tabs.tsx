import React, {
  forwardRef,
  FunctionComponent,
  ReactNode,
  RefAttributes,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";

interface Tab {
  name: ReactNode;
  title: string;
  render: () => ReactNode;
}

export interface TabsRef {
  selectTab: (title: string) => void;
}

interface Props {
  className?: string;
  tabs?: (Tab | false)[];
  activeTab?: number;
  onChange?: (newTab: number) => void;
}
export const Tabs: FunctionComponent<
  Props & RefAttributes<TabsRef>
> = forwardRef(({ tabs, className, ...props }, ref) => {
  const usableTabs = tabs?.filter((tab): tab is Tab => !!tab) || [];

  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState(0);
  const activeTab = props.activeTab ?? uncontrolledActiveTab;
  const setActiveTab = props.onChange ?? setUncontrolledActiveTab;

  useEffect(() => {
    if ((usableTabs.length || 0) <= activeTab && activeTab !== 0) {
      setActiveTab((usableTabs.length || 1) - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableTabs.length]);

  useImperativeHandle(ref, () => ({
    selectTab(title) {
      setActiveTab(usableTabs.findIndex((tab) => tab.title === title));
    },
  }));

  return (
    <div className={`${className || ""} tabs flex flex-col h-full`}>
      {usableTabs.length > 1 && (
        <div className="btngrp-h">
          {usableTabs.map(({ name, title }, index) => (
            <button
              key={index}
              className={`tab btn px-6 ${activeTab === index ? "active" : ""}`}
              title={title}
              onClick={() => setActiveTab(index)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="tab-content flex flex-col overflow-y-auto">
        {usableTabs[activeTab]?.render() || null}
      </div>
    </div>
  );
});
