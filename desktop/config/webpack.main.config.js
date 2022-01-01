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
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            ...require("../swc.config"),
            // lm_a95a542d63 electron version
            env: {
              targets: { electron: "16" },
              include: ["proposal-nullish-coalescing-operator"],
            },
          },
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
