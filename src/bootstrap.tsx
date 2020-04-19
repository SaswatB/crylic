import React, { FunctionComponent } from "react";
import ModalContainer from "react-modal-promise";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";
import blue from "@material-ui/core/colors/blue";
import purple from "@material-ui/core/colors/purple";
import { SnackbarProvider } from "notistack";

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: blue,
    secondary: purple,
  },
});

export const Bootstrap: FunctionComponent = ({ children }) => (
  <SnackbarProvider maxSnack={3}>
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>
        <ModalContainer />
        {children}
      </ThemeProvider>
    </React.StrictMode>
  </SnackbarProvider>
);
