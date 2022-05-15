## Getting started

Dependencies need to be installed in the workspace with `yarn`, and in the `app/` directory with `npm i`.

To run, use the following commands in separate terminals:

```
# Run the web server
yarn web:dev
# Run the electron app, which reads from the web server
yarn electron:dev
```

## Testing

```
# Run all tests
yarn test
# Run all tests with hot reloading
yarn test -- --watch
# Run a specific test file
yarn test -- --testPathPattern=test/TyperUtils.test.ts
```

## Release Process

### Version bump

Run `yarn bump [major|minor|patch]` to bump the version number & create a new git commit, by default it will run `patch`.
Push with `git push --follow-tags` or set the following to push tags by default: `git config --global push.followTags true`.

### Sentry

Sentry is used for error reporting, make sure to run `sentry-cli login` before building.
`yarn build` automatically uploads build artifacts to sentry under the git commit hash.

### Local build

```
yarn build
yarn package
```

### Agent build

Locally

```
yarn build
node scripts\buildpack.js
```

Remotely (after copying build.zip)

```
npm i
cd app
npm ci
cd ..
npm run package
```

### Template project creation

- add/modify template within `templates/`
- run `yarn zip-templates`

### Notary steps

```
# upload to notary:
xcrun altool --notarize-app --primary-bundle-id "com.hstar.crylic" -u <AC_USER> -p <AC_PASS> -f dist/crylic-<version>.dmg

# check notary status:
xcrun altool --notarization-history 0 -u <AC_USER> -p <AC_PASS>

# check if app passes gatekeeper:
spctl -a -t exec -vv dist/mac/crylic.app
```
