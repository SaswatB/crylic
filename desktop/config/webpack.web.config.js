const path = require("path");
const webpack = require("webpack");
const SentryWebpackPlugin = require("@sentry/webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const getCommonWebpackDefines = require("./common-defines");

const resolveApp = (part) => path.join(__dirname, "../" + part);

const PORT = 12000;

module.exports = (_env, argv) => ({
  mode: argv.mode,
  entry: [resolveApp("src/index.tsx")],
  devtool:
    argv.mode === "development" ? "cheap-module-source-map" : "source-map",
  output: {
    path: argv.mode === "development" ? undefined : resolveApp("build"),
    pathinfo: argv.mode === "development",
    filename:
      argv.mode === "development"
        ? "static/js/bundle.js"
        : "static/js/[name].[contenthash:8].js",
    assetModuleFilename:
      argv.mode === "development"
        ? "static/asset/[name][ext]"
        : "static/asset/[name].[contenthash:8][ext]",
    publicPath:
      argv.mode === "development" ? `http://localhost:${PORT}/` : undefined,
    chunkFilename:
      argv.mode === "development"
        ? "static/js/[name].chunk.js"
        : "static/js/[name].[contenthash:8].chunk.js",
  },
  module: {
    rules: [
      {
        // Include ts, tsx, js, and jsx files.
        test: /\.[tj]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "swc-loader",
          options: {
            ...require("../swc.config"),
            // lm_a95a542d63 electron version
            env: { targets: { electron: "17" } },
          },
        },
      },
      // https://github.com/webpack/webpack/issues/11467
      {
        test: /\.m?js$/,
        resolve: { fullySpecified: false },
      },

      // style loaders for css/scss
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(scss|sass)$/,
        use: [
          "style-loader",
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: ["tailwindcss", "autoprefixer"],
              },
              sourceMap: true,
            },
          },
          "sass-loader",
        ],
      },

      // image loaders
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
        type: "asset/resource",
      },
      // special rule to allow importing onigasm's wasm
      {
        test: /.*onigasm.*\.wasm$/,
        loader: "file-loader",
        type: "javascript/auto",
      },
      // fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
      // text files
      {
        test: /\.txt$/i,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
    fallback: {
      os: false,
      fs: false,
      tls: false,
      net: false,
      path: false,
      zlib: false,
      http: false,
      https: false,
      stream: false,
      crypto: false,
      module: false,
      dgram: false,
      dns: false,
      http2: false,
      child_process: false,
      util: false,
      assert: false,
    },
  },
  target: "electron-renderer",
  node: {
    __dirname: false,
  },
  optimization: {
    nodeEnv: false,
  },
  plugins: [
    argv.mode !== "development" &&
      new SentryWebpackPlugin({
        include: "./build",
        urlPrefix: "app:///build",
      }),
    new webpack.DefinePlugin(
      getCommonWebpackDefines({
        isProduction: argv.mode !== "development",
        isRendererBundle: true,
      })
    ),
    // Generates an `index.html` file with the <script> injected.
    new HtmlWebpackPlugin({
      inject: true,
      template: resolveApp("public/index.html"),
      minify:
        argv.mode !== "development"
          ? {
              removeComments: true,
              collapseWhitespace: true,
              removeRedundantAttributes: true,
              useShortDoctype: true,
              removeEmptyAttributes: true,
              removeStyleLinkTypeAttributes: true,
              keepClosingSlash: true,
              minifyJS: true,
              minifyCSS: true,
              minifyURLs: true,
            }
          : undefined,
    }),
    new MonacoWebpackPlugin({
      // available options are documented at https://github.com/Microsoft/monaco-editor-webpack-plugin#options
      languages: [
        "javascript",
        "typescript",
        "css",
        "scss",
        "less",
        "html",
        "json",
      ],
    }),
  ].filter(Boolean),
  devServer: {
    port: PORT,
    static: {
      directory: resolveApp("public"),
      publicPath: "/static",
    },
  },
  ignoreWarnings: [
    // node_modules/typescript/lib/typescript.js contains some require() calls that use expressions
    // these aren't supported by webpack and aren't used by us so ignore the warnings
    {
      module: /typescript.js/,
      message:
        /Critical dependency: the request of a dependency is an expression/,
    },
  ],
});
