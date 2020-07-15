const webpack = require("webpack");
const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const SentryWebpackPlugin = require("@sentry/webpack-plugin");
const {
  addBabelPlugin,
  addWebpackPlugin,
  addWebpackAlias,
  override,
} = require("customize-cra");

const DEV_PLUGINS = [
  addBabelPlugin(require.resolve("react-refresh/babel")),
  addWebpackPlugin(new ReactRefreshPlugin({})),
];

const PROD_PLUGINS = [
  addWebpackPlugin(
    new SentryWebpackPlugin({
      include: "./build",
      urlPrefix: "app:///build",
    })
  ),
];

module.exports = override(
  ...(process.env.NODE_ENV === "development" ? DEV_PLUGINS : PROD_PLUGINS),
  (config) => require("react-app-rewire-postcss")(config, true),
  addWebpackPlugin(
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ["javascript", "typescript", "css", "scss", "less", "html"],
    })
  ),
  addWebpackAlias({
    fs: "browserfs/dist/shims/fs.js",
    // buffer: "browserfs/dist/shims/buffer.js",
    path: "browserfs/dist/shims/path.js",
    processGlobal: "browserfs/dist/shims/process.js",
    // bufferGlobal: "browserfs/dist/shims/bufferGlobal.js",
    bfsGlobal: require.resolve("browserfs"),
  }),
  addWebpackPlugin(
    new webpack.ProvidePlugin({
      BrowserFS: "bfsGlobal",
      process: "processGlobal",
    })
  ),
  (config) => ({ ...config, node: { ...config.node, process: false } })
);
