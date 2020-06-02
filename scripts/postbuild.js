const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

const commit = child_process
  .execSync("git rev-parse HEAD", {
    encoding: "utf8",
  })
  .trim();

const sentryConfigPath = path.join(__dirname, "../app/build/sentry.js");
const sentryConfig = fs.readFileSync(sentryConfigPath, { encoding: "utf8" });
fs.writeFileSync(sentryConfigPath, sentryConfig.replace("paint-dev", commit));
