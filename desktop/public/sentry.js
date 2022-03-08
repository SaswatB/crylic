// this gets replaced by the git commit id for production builds
const release = "paint-dev";
if (release === "paint-dev") return;

const Store = require("electron-store");
const store = new Store();

const Sentry =
  process.type === undefined
    ? require("@sentry/node")
    : require("@sentry/electron");
Sentry.init({
  dsn:
    "https://bdbb761a7a54493a8ef0343516421d0a@o400877.ingest.sentry.io/5259708",
  release,
  beforeSend: (e) => {
    if (store.get("tracking_disabled") === true) return null;
    return e;
  },
});
