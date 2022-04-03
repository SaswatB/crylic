module.exports = {
  bootstrap: "../synergy/src/bootstrap.tsx",
  webpack: {
    overrideConfig: {
      path: "../synergy/crylic-webpack-override.js",
    },
  },
  htmlTemplate: {
    path: "../desktop/public/index.html",
  },
};
