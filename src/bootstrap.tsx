import React, { FunctionComponent } from "react";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";
import { SnackbarProvider } from "notistack";

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
  },
});

export const Bootstrap: FunctionComponent = ({ children }) => (
  <SnackbarProvider maxSnack={3}>
    <React.StrictMode>
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    </React.StrictMode>
  </SnackbarProvider>
);
