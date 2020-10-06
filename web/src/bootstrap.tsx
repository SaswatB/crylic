import React, { FunctionComponent } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import {
  ApolloClient,
  ApolloProvider,
  createHttpLink,
  InMemoryCache,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { createMuiTheme, ThemeProvider } from "@material-ui/core";
import blue from "@material-ui/core/colors/blue";
import purple from "@material-ui/core/colors/purple";
import { SnackbarProvider } from "notistack";
// import { loadWASM } from "onigasm";
import { RecoilRoot } from "recoil";
import { BusProvider } from "ts-bus/react";

import { ModalContainer } from "synergy/src/components/PromiseModal";
import { TourProvider } from "synergy/src/components/Tour/Tour";
import { StateManager } from "synergy/src/components/Workspace/StateManager";
import { bus } from "synergy/src/lib/events";

import { getVerifiedAuthToken } from "./hooks/recoil/useAuth";
// loadWASM(require("onigasm/lib/onigasm.wasm").default);

const darkTheme = createMuiTheme({
  palette: {
    type: "dark",
    primary: blue,
    secondary: purple,
  },
});

const httpLink = createHttpLink({
  uri: "/graphql",
});

const authLink = setContext(async (_, { headers }) => {
  const newHeaders = { ...headers };
  const token = await getVerifiedAuthToken();
  if (token) newHeaders.Authorization = `Bearer ${token}`;
  return { headers: newHeaders };
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export const Bootstrap: FunctionComponent = ({ children }) => (
  <RecoilRoot>
    <Router>
      <BusProvider value={bus}>
        <ApolloProvider client={client}>
          <SnackbarProvider maxSnack={3}>
            <ThemeProvider theme={darkTheme}>
              <TourProvider>
                <ModalContainer />
                <StateManager />
                {children}
              </TourProvider>
            </ThemeProvider>
          </SnackbarProvider>
        </ApolloProvider>
      </BusProvider>
    </Router>
  </RecoilRoot>
);
