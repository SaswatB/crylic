const path = __non_webpack_require__("path") as typeof import("path");
const appPath = __non_webpack_require__
  .resolve("webpack")
  .replace(/node_modules[/\\].*$/, "");
const sentryPath = path.join(
  appPath,
  process.env.NODE_ENV === "development"
    ? "desktop/public/sentry.js"
    : "build/sentry.js"
);

// init sentry on the child process
if (process.env.DISABLE_TRACKING !== "true")
  __non_webpack_require__(sentryPath);

let appModulesPath = path.join(appPath, "node_modules");

// fix resolution paths so that modules are taken from app/ during development
let moduleRequire: (m: string) => any = __non_webpack_require__;
if (process.env.NODE_ENV === "development") {
  moduleRequire = (m) =>
    __non_webpack_require__(path.join(appPath, "desktop/app/node_modules", m));
  appModulesPath = path.join(appPath, "desktop/app/node_modules");
}

// mock terminal
[process.stdout, process.stderr].forEach((io) => {
  io.isTTY = true;
  io.hasColors = () => true;
  io.columns = 80;
  io.rows = 25;
});

// handle commands
if (process.argv[2] === "npm-install") {
  const npm = moduleRequire("npm");
  process.chdir(process.argv[3]!);
  npm.load((err: unknown) => {
    if (err) {
      console.error(err);
      return;
    }

    const args: string[] = [];
    if (process.argv[5] === "true") args.push("-D"); // dev dep
    if (process.argv[4]) args.push(process.argv[4]); // package name

    console.log("> npm install", args.join(" "));
    npm.commands.install(args, () => {});
  });
} else if (process.argv[2] === "yarn-install") {
  process.chdir(process.argv[3]!);

  const args: string[] = [];
  if (process.argv[4]) {
    // package name
    args.push("add");
    if (process.argv[5] === "true") args.push("-D"); //dev dep
    args.push(process.argv[4]);
  }

  process.argv = [
    process.argv0,
    path.join(appModulesPath, "yarn/bin/yarn.js"),
    ...args,
  ];
  moduleRequire("yarn/lib/cli");
} else if (process.argv[2] === "yarn2-install") {
  // not currently used, likely won't be needed since yarn1 can invoke yarn2
  const { Cache, Configuration, Project, StreamReport } = moduleRequire(
    "@yarnpkg/core"
  );
  const { npath } = moduleRequire("@yarnpkg/fslib");
  const yarnPlugins = [
    "@yarnpkg/plugin-compat",
    "@yarnpkg/plugin-dlx",
    "@yarnpkg/plugin-essentials",
    "@yarnpkg/plugin-file",
    "@yarnpkg/plugin-git",
    "@yarnpkg/plugin-github",
    "@yarnpkg/plugin-http",
    "@yarnpkg/plugin-init",
    "@yarnpkg/plugin-link",
    "@yarnpkg/plugin-nm",
    "@yarnpkg/plugin-npm",
    "@yarnpkg/plugin-npm-cli",
    "@yarnpkg/plugin-pack",
    "@yarnpkg/plugin-patch",
    "@yarnpkg/plugin-pnp",
  ];

  const moduleMap = new Map();
  ["@yarnpkg/core", "@yarnpkg/fslib", ...yarnPlugins].forEach((name) => {
    moduleMap.set(name, moduleRequire(name));
  });

  const dir = process.argv[3]!;

  void (async () => {
    const dirPP = npath.toPortablePath(dir);
    const configuration = await Configuration.find(dirPP, {
      modules: moduleMap,
      plugins: new Set(yarnPlugins),
    });

    await StreamReport.start(
      {
        configuration,
        stdout: process.stdout,
      },
      async (report: typeof StreamReport) => {
        const { project } = await Project.find(configuration, dirPP);
        const cache = await Cache.find(configuration);

        await project.install({ cache, report });
      }
    );
  })().then(() => process.exit(0));
} else {
  console.log("unknown child process command");
}

export {};
