module.exports = function binaryLoader(source) {
  return `module.exports = Buffer.from('${source.toString(
    "base64"
  )}', 'base64');`;
};
module.exports.raw = true;
