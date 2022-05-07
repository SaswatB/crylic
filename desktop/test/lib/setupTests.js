global.__non_webpack_require__ = (name) => {
  if (name === "electron") {
    return {
      ipcRenderer: {
        once() {},
        send() {},
        invoke() {
          return Promise.resolve("");
        },
      },
    };
  }

  return require(name);
};
