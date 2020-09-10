const { override, babelInclude, babelExclude } = require("customize-cra");

module.exports = override(
  babelExclude(/node_modules/),
  babelInclude(undefined) // needed to compile synergy
);
