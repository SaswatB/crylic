const childProcess = require("child_process");

module.exports = function getCommonWebpackDefines({
  isProduction,
  isRendererBundle,
}) {
  return {
    // pin NODE_ENV to development, even for production builds, so that dev-only libs like react-refresh work as expected
    "process.env": {
      NODE_ENV: JSON.stringify("development"),
    },
    __BUILD_VERSION__: JSON.stringify(require("../package.json").version),
    __COMMIT_HASH__: JSON.stringify(
      childProcess.execSync("git rev-list HEAD --max-count=1").toString()
    ),
    __IS_PRODUCTION__: JSON.stringify(isProduction),
    __IS_RENDERER_BUNDLE__: JSON.stringify(isRendererBundle),
    __IS_CRYLIC__: JSON.stringify(false), // for when Crylic is used to edit itself
  };
};
