import React, { FunctionComponent } from "react";
import "./index.css";

export const Bootstrap: FunctionComponent = ({ children }) => (
  <React.StrictMode>{children}</React.StrictMode>
);
