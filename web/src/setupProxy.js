const { createProxyMiddleware } = require("http-proxy-middleware");
module.exports = function (app) {
  // target spring
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8080/",
      changeOrigin: true,
      pathRewrite: { "^/api": "/" },
    })
  );
  // target hasura, which can delegate to spring
  app.use(
    "/graphql",
    createProxyMiddleware({
      target: "http://localhost:8090/",
      changeOrigin: true,
    })
  );
};
