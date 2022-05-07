/**
 * Webpack override function for Crylic
 *
 * @param {import('webpack').Configuration} config Webpack config generated by Crylic
 * @param {import('webpack')} webpack Instance of Webpack
 * @returns {import('webpack').Configuration} Modified webpack config
 */
module.exports = function (options, webpack) {
  const { jsc } = options.module.rules[0].oneOf.filter(
    (o) => o?.use?.loader === "swc-loader"
  )[1].use.options;
  jsc.parser = {
    syntax: "typescript",
    tsx: true,
    jsx: true,
    decorators: true,
  };
  jsc.transform.legacyDecorator = true;
  jsc.transform.decoratorMetadata = true;
  return options;
};
