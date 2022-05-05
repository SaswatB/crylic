const loaderUtils = require("loader-utils");

module.exports = function () {};

/**
 * This loader combines next-image-loader and file-loader
 * next-image-loader is used to get the image size, and file-loader is used to load the image
 *
 * The result is a value that works with NextJs's image loader and works without needing to mimic Next's image hosting
 * but it does require a redirect from /_next/image/ to the correct route in the dev server since the Next image component also rewrites the url ;_;
 */
module.exports.pitch = function (remainingRequest) {
  this.cacheable();

  const nextLoaderOptions = {
    isServer: false,
    isDev: true,
    basePath: "",
    assetPrefix: "",
  };

  const fileLoaderOptions = {
    name: "static/media/[name].[hash:8].[ext]",
  };

  return `module.exports = {
    ...require(${loaderUtils.stringifyRequest(
      this,
      `-!next/dist/build/webpack/loaders/next-image-loader?${JSON.stringify(
        nextLoaderOptions
      )}!${remainingRequest}`
    )}).default,
    src: require(${loaderUtils.stringifyRequest(
      this,
      `-!file-loader?${JSON.stringify(fileLoaderOptions)}!${remainingRequest}`
    )}).default,
    blurDataURL: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
  }`;
};
