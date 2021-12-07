const path = __non_webpack_require__("path") as typeof import("path");
const dirPath = __non_webpack_require__
  .resolve("webpack")
  .replace(/node_modules[/\\].*$/, "");
const sentryPath = path.join(
  dirPath,
  process.env.NODE_ENV === "development"
    ? "desktop/public/sentry.js"
    : "build/sentry.js"
);

// init sentry on the child process
__non_webpack_require__(sentryPath);

// mock terminal
[process.stdout, process.stderr].forEach((io) => {
  io.isTTY = true;
  io.hasColors = () => true;
  io.columns = 80;
  io.rows = 25;
});

// handle commands
if (process.argv[2] === "npm-install") {
  const npm = __non_webpack_require__("npm") as typeof import("npm");
  process.chdir(process.argv[3]!);
  npm.load((err) => {
    if (err) {
      console.error(err);
      return;
    }

    const args: string[] = [];
    if (process.argv[5] === "true") args.push("-D");
    if (process.argv[4]) args.push(process.argv[4]);

    console.log("> npm install", args.join(" "));
    npm.commands.install(args, () => {});
  });
} else {
  console.log("unknown child process command");
}

export {};
