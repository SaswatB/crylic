const path = require("path");
const SentryWebpackPlugin = require("@sentry/webpack-plugin");

module.exports = (env, argv) => ({
  entry: { electron: "./src/electron.ts" },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, "build-main"),
    filename: "[name].js",
  },
  plugins: [
    argv.mode !== "development" &&
      new SentryWebpackPlugin({
        include: "./build-main",
        urlPrefix: "app:///build-main",
      }),
  ].filter(Boolean),
});
