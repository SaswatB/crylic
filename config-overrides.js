const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const { addBabelPlugin, addWebpackPlugin, override } = require("customize-cra");

const DEV_PLUGINS = [
  addBabelPlugin(require.resolve("react-refresh/babel")),
  addWebpackPlugin(new ReactRefreshPlugin({})),
];

module.exports = override(
  ...(process.env.NODE_ENV === "development" ? DEV_PLUGINS : []),
  (config) => require("react-app-rewire-postcss")(config, true),
  addWebpackPlugin(
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ["javascript", "typescript", "css", "scss", "less", "html"],
    })
  )
);
