const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const SentryWebpackPlugin = require("@sentry/webpack-plugin");
const {
  addBabelPlugin,
  addWebpackPlugin,
  override,
  addWebpackModuleRule,
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
  addWebpackModuleRule({
    test: /.*onigasm.*\.wasm$/,
    loader: "file-loader",
    type: "javascript/auto",
  })
);
