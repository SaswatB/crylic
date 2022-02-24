global.__non_webpack_require__ = (name) => {
  if (name === "electron") {
    return {
      ipcRenderer: {
        once() {},
        send() {},
      },
    };
  }

  return require(name);
};
