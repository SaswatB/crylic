import React, { FunctionComponent, useState } from "react";
import styled from "@emotion/styled";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import { renderSeparator } from "../lib/render-utils";
import { DEFAULT_TRANSITION, MID_COLOR } from "./base/design-constants";
import { IconButton } from "./IconButton";

interface Props {
  title: string;
  variant?: "inline" | "outline";
  defaultCollapsed?: boolean;
}

export const Collapsible: FunctionComponent<Props> = ({
  title,
  variant,
  defaultCollapsed,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);

  if (variant === "outline") {
    return (
      <Container>
        <Row collapsed={collapsed} onClick={() => setCollapsed(!collapsed)}>
          <IconButton
            className="ml-2 pointer-events-none"
            title={collapsed ? "Expand" : "Collapse"}
            icon={collapsed ? faChevronDown : faChevronUp}
          />
          <Title>{title}</Title>
        </Row>
        {!collapsed && <Content>{children}</Content>}
      </Container>
    );
  }

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

const Container = styled.div`
  display: flex;
  flex-direction: column;
  border: solid 1px ${MID_COLOR};

  & + & {
    border-top: none;
  }
`;

const Row = styled.div<{ collapsed: boolean }>`
  display: flex;
  padding: 7px 10px;
  margin: -1px;
  align-items: center;
  font-size: 10px;
  cursor: pointer;
  transition: ${DEFAULT_TRANSITION};
  opacity: ${(props) => (props.collapsed ? 0.7 : 1)};

  &:hover {
    background-color: ${MID_COLOR};
    opacity: 1;
  }
`;

const Title = styled.span`
  margin-top: 0px;
  margin-bottom: 0px;
  margin-left: 12px;
  margin-right: 0px;
  color: #ffffff;
  font-size: 14px;
`;

const Content = styled.div`
  padding: 6px;
`;
