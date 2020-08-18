const path = require("path");
const SentryWebpackPlugin = require("@sentry/webpack-plugin");

module.exports = (env, argv) => ({
  entry: {
    electron: "./src/electron.ts",
    "electron-child": "./src/electron-child.ts",
  },
  devtool: "source-map",
  output: {
    path: path.resolve(
      __dirname,
      argv.mode === "development" ? "../build-main-dev" : "../build-main"
    ),
    filename: "[name].js",
  },
  module: {
    rules: [
      {
        // Include ts, tsx, js, and jsx files.
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          presets: [
            ["@babel/preset-env", { targets: { electron: "8" } }],
            "@babel/preset-typescript",
          ],
        },
      },
    ],
  },
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  target: "node",
  node: {
    __dirname: false,
  },
  plugins: [
    argv.mode !== "development" &&
      new SentryWebpackPlugin({
        include: "./build-main",
        urlPrefix: "app:///build-main",
      }),
  ].filter(Boolean),
});
