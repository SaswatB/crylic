const popupMap: Record<string, Window | null | undefined> = {};
const popupCallbackMap: Record<string, Function> = {};
export const openSignInWindow = (
  url: string,
  name: string,
  onSuccess: Function
) => {
  popupCallbackMap[url] = onSuccess;

  // if an existing window exists for this popup, focus it
  if (popupMap[url] && !popupMap[url]?.closed) {
    popupMap[url]?.focus();
    return;
  }

  // open the signup window
  popupMap[url] = window.open(
    url,
    name,
    "toolbar=no, menubar=no, width=600, height=700, top=100, left=100"
  );
};
// listen for a success message
window.addEventListener("message", (event) => {
  if (
    event.origin !== window.location.origin ||
    event.data !== "crylic-success"
  ) {
    return;
  }

  const url = Object.entries(popupMap).find(
    ([, value]) => value === event.source
  )?.[0];
  if (url) {
    popupCallbackMap[url]?.();
    delete popupCallbackMap[url];
  }
});
