import "reflect-metadata";

import React, { FunctionComponent } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ReactTooltip from "react-tooltip";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";
import blue from "@material-ui/core/colors/blue";
import purple from "@material-ui/core/colors/purple";
import { SnackbarProvider } from "notistack";
import { RecoilRoot } from "recoil";
import { BusProvider } from "ts-bus/react";

import { ModalContainer } from "./components/PromiseModal";
import { TourProvider } from "./components/Tour/Tour";
import { StateManager } from "./components/Workspace/StateManager";
import { bus } from "./lib/events";
import "./shared.scss";

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: blue,
    secondary: purple,
  },
});

// stub __non_webpack_require__ when editing within Crylic
if (__IS_CRYLIC__) {
  (window as any).require = (n: string) => {
    switch (n) {
      case "electron-store":
        return class MockStore {};
      case "electron":
        return { ipcRenderer: { invoke: () => Promise.resolve({}) } };
      case "path":
        return require("path");
      default:
        return {};
    }
  };
}

export const Bootstrap: FunctionComponent = ({ children }) => (
  <RecoilRoot>
    <BusProvider value={bus}>
      <ThemeProvider theme={darkTheme}>
        <SnackbarProvider maxSnack={3}>
          <TourProvider>
            <DndProvider backend={HTML5Backend}>
              <ModalContainer />
              <StateManager />
              <ReactTooltip effect="solid" />
              {children}
            </DndProvider>
          </TourProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </BusProvider>
  </RecoilRoot>
);
