import React, { FunctionComponent, useState } from "react";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import { renderSeparator } from "../utils/utils";
import { IconButton } from "./IconButton";

interface Props {
  title: string;
  defaultCollapsed?: boolean;
}

export const Collapsible: FunctionComponent<Props> = ({
  title,
  defaultCollapsed,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);

  return (
    <>
      {renderSeparator(
        title,
        <IconButton
          className="ml-2"
          title={collapsed ? "Expand" : "Collapse"}
          icon={collapsed ? faChevronDown : faChevronUp}
          onClick={() => setCollapsed(!collapsed)}
        />
      )}
      {!collapsed && children}
    </>
  );
};
