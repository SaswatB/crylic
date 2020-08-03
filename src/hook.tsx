// Since the react instance used in the iframe is shared with the electron version
// to get hmr working in the iframe the electron version must have the global hook
// injected before running

// Only inject the runtime if it hasn't been injected
if (!(window as any).__reactRefreshInjected) {
  const RefreshRuntime = require("react-refresh/runtime");
  // Inject refresh runtime into global scope
  RefreshRuntime.injectIntoGlobalHook(window);

  // Mark the runtime as injected to prevent double-injection
  (window as any).__reactRefreshInjected = true;
}
export {};
