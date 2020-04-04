const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { addBabelPlugin, addWebpackPlugin, override, removeModuleScopePlugin } = require('customize-cra');

module.exports = override(
  config => require('react-app-rewire-postcss')(config, true),
  addBabelPlugin(require.resolve('react-refresh/babel')),
  addWebpackPlugin(new ReactRefreshPlugin({}))
);
