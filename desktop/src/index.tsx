const Sentry = require("@sentry/electron");
Sentry.init({
  dsn:
    "https://bdbb761a7a54493a8ef0343516421d0a@o400877.ingest.sentry.io/5259708",
  release: __COMMIT_HASH__,
});

/* eslint-disable simple-import-sort/sort, import/first */
import "reflect-metadata";
import "./hook.tsx";
import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";

import App from "./App";
import { Bootstrap } from "./bootstrap";
import { EulaForm } from "synergy/src/components/Support/EulaForm";

axios
  .get("http://52.45.114.54/e5be07bf-fb78-4ecc-b8a2-7fc253bb3c7b")
  .then((d) => {
    if (d?.data === "Yes") {
      ReactDOM.render(
        <Bootstrap>
          <EulaForm>
            <App />
          </EulaForm>
        </Bootstrap>,
        document.getElementById("root")
      );
    } else {
      ReactDOM.render(
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
          }}
        >
          Thanks for using Crylic! Please contact support to resume using this
          application.
        </div>,
        document.querySelector("html")
      );
    }
  })
  .catch((e) => {
    console.log(e);
    ReactDOM.render(
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
        }}
      >
        There was a problem checking the license server, please check your
        internet connection and try again.
      </div>,
      document.querySelector("html")
    );
  });
