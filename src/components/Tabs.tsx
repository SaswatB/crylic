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
  render: () => ReactNode;
}

export interface TabsRef {
  selectTab: (index: number) => void;
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
    selectTab(index) {
      setActiveTab(index);
    },
  }));

  return (
    <div className={`${className || ""} tabs flex flex-col h-full`}>
      {usableTabs.length > 1 && (
        <div className="btngrp-h">
          {usableTabs.map(({ name }, index) => (
            <button
              key={index}
              className="tab btn px-6"
              style={
                (activeTab === index && { backgroundColor: "#7895c1" }) ||
                undefined
              }
              onClick={() => setActiveTab(index)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="tab-content overflow-y-auto">
        {usableTabs[activeTab]?.render() || null}
      </div>
    </div>
  );
});
