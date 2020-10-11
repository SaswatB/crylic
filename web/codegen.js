module.exports = {
  client: {
    service: {
      name: "hasura",
      url: "http://localhost/graphql",
      headers: {
        Authorization: "Bearer " + process.env.AUTH_TOKEN,
      },
    },
  },
};
