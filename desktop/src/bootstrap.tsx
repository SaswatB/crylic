import React, { FunctionComponent } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import ReactTooltip from "react-tooltip";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";
import blue from "@material-ui/core/colors/blue";
import purple from "@material-ui/core/colors/purple";
import { SnackbarProvider } from "notistack";
import { loadWASM } from "onigasm";
import { RecoilRoot } from "recoil";
import { BusProvider } from "ts-bus/react";

import { ModalContainer } from "synergy/src/components/PromiseModal";
import { TourProvider } from "synergy/src/components/Tour/Tour";
import { StateManager } from "synergy/src/components/Workspace/StateManager";
import { bus } from "synergy/src/lib/events";

loadWASM(require("onigasm/lib/onigasm.wasm").default);

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: blue,
    secondary: purple,
  },
});

export const Bootstrap: FunctionComponent = ({ children }) => (
  <RecoilRoot>
    <BusProvider value={bus}>
      <SnackbarProvider maxSnack={3}>
        <ThemeProvider theme={darkTheme}>
          <TourProvider>
            <DndProvider backend={HTML5Backend}>
              <ModalContainer />
              <StateManager />
              <ReactTooltip effect="solid" />
              {children}
            </DndProvider>
          </TourProvider>
        </ThemeProvider>
      </SnackbarProvider>
    </BusProvider>
  </RecoilRoot>
);
