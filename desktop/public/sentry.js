// this gets replaced by the git commit id for production builds
const release = "paint-dev";
if (release === "paint-dev") return;

let Sentry;
let isTrackingDisabled;

if (process.type !== undefined) {
  const Store = require("electron-store");
  const store = new Store();
  Sentry = require("@sentry/electron");
  isTrackingDisabled = () => store.get("tracking_disabled") === true;
} else {
  // electron-child support
  Sentry = require("@sentry/node");
  isTrackingDisabled = () => false; // tracking is disabled through a separate mechanism
}

Sentry.init({
  dsn: "https://bdbb761a7a54493a8ef0343516421d0a@o400877.ingest.sentry.io/5259708",
  release,
  beforeSend: (e) => (isTrackingDisabled() ? null : e),
});
