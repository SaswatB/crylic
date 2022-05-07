import styled from "@emotion/styled";

import { DEFAULT_BORDER_RADIUS, DEFAULT_TRANSITION } from "./design-constants";

// todo remove -emotion suffix after css .btn is removed
export const Button = styled("button", { target: "btn-emotion" })<{
  active?: boolean;
  superActive?: boolean;
  block?: boolean;
}>`
  padding: 0.5rem;
  background-color: transparent;
  color: white;
  border-radius: ${DEFAULT_BORDER_RADIUS};
  border: 1px solid rgba(255, 255, 255, 0.23);
  transition: ${DEFAULT_TRANSITION};
  cursor: pointer;
  ${({ block }) => (block ? "width: 100%;" : "")}

  &:hover {
    background-color: rgba(255, 255, 255, 0.3);
    border-color: white;
  }

  &:active {
    background-color: rgba(255, 255, 255, 0.4);
    border-color: white;
  }

  &:active
    ${({ active, superActive }) => (active || superActive ? ", &" : "")} {
    &:focus {
      box-shadow: none;
    }
  }

  ${({ active, superActive }) =>
    active || superActive ? "background-color: rgb(117, 129, 146);" : ""}

  ${({ superActive }) =>
    superActive
      ? `
    animation: border-pulsate 2s infinite;
    --border-light: rgba(255, 255, 255, 1);
    --border-dark: rgba(255, 255, 255, 0.3);
      `
      : ""}
`;

export const ButtonGroupH = styled("div", {
  target: "btngrp-h-emotion",
})`
  display: flex;
  flex-shrink: 0;
  overflow-x: auto;

  > ${Button}, > ${(): string => ButtonGroupV as unknown as string} {
    flex-grow: 1;
    min-width: min-content;

    &:not(:last-child) {
      &,
      ${Button} {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
    }

    &:not(:first-child) {
      &,
      ${Button} {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
      }
    }
  }
`;

export const ButtonGroupV = styled("div", {
  target: "btngrp-v-emotion",
})`
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  overflow-y: auto;

  > ${Button}, > ${ButtonGroupH} {
    flex-grow: 1;
    min-height: min-content;

    &:not(:last-child) {
      &,
      ${Button} {
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
      }
    }

    &:not(:first-child) {
      &,
      ${Button} {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
      }
    }
  }
`;
