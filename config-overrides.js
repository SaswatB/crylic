const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const { addBabelPlugin, addWebpackPlugin, override, removeModuleScopePlugin } = require('customize-cra');

module.exports = override(
  config => require('react-app-rewire-postcss')(config, true),
  addBabelPlugin(require.resolve('react-refresh/babel')),
  addWebpackPlugin(new ReactRefreshPlugin({})),
  addWebpackPlugin(new MonacoWebpackPlugin({
    // available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
    languages: ['javascript']
  }))
);
