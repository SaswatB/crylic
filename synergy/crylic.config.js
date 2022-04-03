module.exports = {
  bootstrap: "./src/bootstrap.tsx",
  webpack: {
    overrideConfig: {
      path: "crylic-webpack-override.js",
    },
  },
  htmlTemplate: {
    path: "../desktop/public/index.html",
  },
};
