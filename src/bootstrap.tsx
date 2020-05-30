import React, { FunctionComponent } from "react";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";
import blue from "@material-ui/core/colors/blue";
import purple from "@material-ui/core/colors/purple";
import { SnackbarProvider } from "notistack";

import { ModalContainer } from "./components/PromiseModal";
import { TourProvider } from "./components/Tour";

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: blue,
    secondary: purple,
  },
});

export const Bootstrap: FunctionComponent = ({ children }) => (
  <SnackbarProvider maxSnack={3}>
    <ThemeProvider theme={darkTheme}>
      <TourProvider>
        <ModalContainer />
        {children}
      </TourProvider>
    </ThemeProvider>
  </SnackbarProvider>
);
