const ReactRefreshPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const {
  addBabelPlugin,
  addWebpackPlugin,
  addPostcssPlugins,
  override,
  babelInclude,
  babelExclude,
} = require("customize-cra");

const isDevelopment = process.env.NODE_ENV === "development";

module.exports = override(
  isDevelopment && addBabelPlugin(require.resolve("react-refresh/babel")),
  isDevelopment && addWebpackPlugin(new ReactRefreshPlugin()),
  addPostcssPlugins([require("tailwindcss")]),
  babelExclude(/node_modules/),
  babelInclude(undefined) // needed to compile synergy
);
