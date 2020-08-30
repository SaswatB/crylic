module.exports = function binaryLoader(source) {
  return `module.exports = new Buffer('${source.toString(
    "base64"
  )}', 'base64');`;
};
module.exports.raw = true;
