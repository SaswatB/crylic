const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const { addBabelPlugin, addWebpackPlugin, override } = require("customize-cra");

module.exports = override(
  (config) => require("react-app-rewire-postcss")(config, true),
  addBabelPlugin(require.resolve("react-refresh/babel")),
  addWebpackPlugin(new ReactRefreshPlugin({})),
  addWebpackPlugin(
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: ["javascript", "typescript", "css", "scss", "less", "html"],
    })
  )
);
