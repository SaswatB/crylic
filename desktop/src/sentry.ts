if (__IS_PRODUCTION__) {
  let Sentry: typeof import("@sentry/electron");
  let isTrackingDisabled: () => boolean;

  if (process.type !== undefined) {
    Sentry = __non_webpack_require__("@sentry/electron");
    const store = new (__non_webpack_require__("electron-store"))();
    isTrackingDisabled = () => store.get("tracking_disabled") === true;
  } else {
    // electron-child support
    Sentry = __non_webpack_require__("@sentry/node");
    isTrackingDisabled = () => false; // tracking is disabled through a separate mechanism for electron-child
  }

  Sentry.init({
    dsn: "https://bdbb761a7a54493a8ef0343516421d0a@o400877.ingest.sentry.io/5259708",
    release: __COMMIT_HASH__,
    beforeSend: (e) => (isTrackingDisabled() ? null : e),
  });
}

export {};
