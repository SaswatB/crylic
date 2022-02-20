const fs = require("fs");
const path = require("path");
const semver = require("semver");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

const supportedReleaseStrategies = ["major", "minor", "patch"];
const packageJsonPath = path.join(__dirname, "../package.json");
const appPackageJsonPath = path.join(__dirname, "../app/package.json");
const appPackageJsonLockPath = path.join(__dirname, "../app/package-lock.json");

const releaseStrategy = process.argv[2] || "patch";

if (!supportedReleaseStrategies.includes(releaseStrategy)) {
  throw new Error(`Unsupported release strategy: ${releaseStrategy}`);
}

(async () => {
  const gitStatus = await exec("git status --porcelain");
  if ((gitStatus.stdout.length || gitStatus.stderr.length) > 0) {
    throw new Error("Unable to bump version, there are uncommitted changes.");
  }

  const packageJson = require(packageJsonPath);
  const newVersion = semver.inc(packageJson.version, releaseStrategy);

  packageJson.version = newVersion;
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );

  const appPackageJson = require(appPackageJsonPath);
  appPackageJson.version = newVersion;
  fs.writeFileSync(
    appPackageJsonPath,
    JSON.stringify(appPackageJson, null, 2) + "\n"
  );

  const appPackageLockJson = require(appPackageJsonLockPath);
  appPackageLockJson.version = newVersion;
  appPackageLockJson.packages[""].version = newVersion;
  fs.writeFileSync(
    appPackageJsonLockPath,
    JSON.stringify(appPackageLockJson, null, 2) + "\n"
  );

  await exec("git add -A");
  await exec(`git commit -m v${newVersion}`);
  await exec(`git tag v${newVersion}`);
  console.log(`Committed new version v${newVersion}`);
})();
