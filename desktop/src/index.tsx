if (__IS_PRODUCTION__) {
  const Store = __non_webpack_require__(
    "electron-store"
  ) as typeof import("electron-store");
  const store = new Store();

  // @sentry/electron breaks webpack compilation, so just use @sentry/browser instead
  const Sentry = require("@sentry/browser") as typeof import("@sentry/browser");
  const { RewriteFrames } =
    require("@sentry/integrations") as typeof import("@sentry/integrations");

  const appPath = window.process.argv
    .find((s) => s.startsWith("--appPath="))
    ?.replace(/--appPath=\/?/, "file:///")
    .replace(/\\/g, "/");

  Sentry.init({
    dsn: "https://bdbb761a7a54493a8ef0343516421d0a@o400877.ingest.sentry.io/5259708",
    release: __COMMIT_HASH__,
    beforeSend: (e) => {
      if (store.get("tracking_disabled") === true) return null;
      return e;
    },
    integrations: [
      // since @sentry/browser is used instead of @sentry/electron, the stack frames have to be manually fixed to match sourcemaps
      new RewriteFrames({
        iteratee: (frame) => {
          if (!frame.filename) {
            return frame;
          }
          if (appPath && frame.filename.includes(appPath)) {
            frame.filename = frame.filename.replace(appPath, "app://");
          }
          return frame;
        },
      }),
    ],
  });
}

/* eslint-disable simple-import-sort/imports */
/* eslint-disable import/first */
import "reflect-metadata";
import "./hook.tsx";
import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";
import { Bootstrap } from "synergy/src/bootstrap";
import { EulaForm } from "synergy/src/components/Support/EulaForm";
import { loadWASM } from "onigasm";

loadWASM(require("onigasm/lib/onigasm.wasm").default).catch((e) => {
  console.error("Failed to load onigasm.wasm", e);
});

ReactDOM.render(
  <Bootstrap>
    <EulaForm>
      <App />
    </EulaForm>
  </Bootstrap>,
  document.getElementById("root")
);
