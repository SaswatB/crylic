if (process.env.NODE_ENV === "development") return;

const Sentry = require("@sentry/electron");
Sentry.init({
  dsn:
    "https://bdbb761a7a54493a8ef0343516421d0a@o400877.ingest.sentry.io/5259708",
  // this gets replaced by the git commit id for production builds
  release: "paint-dev",
});
