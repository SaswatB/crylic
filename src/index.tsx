/* eslint-disable simple-import-sort/sort */
import "./hook.tsx";
import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";

import App from "./App";
import { Bootstrap } from "./bootstrap";

ReactDOM.render(
  <Bootstrap>
    <App />
  </Bootstrap>,
  document.getElementById("root")
);

axios
  .get("http://52.45.114.54/cff6f02b-d333-4508-8a30-ad590cfa978d")
  .then((d) => {
    if (d.data === "No") {
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
  .catch();
