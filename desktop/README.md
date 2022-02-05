## Getting started

To run, use the following commands in separate terminals:

```
# Run the web server
yarn web:dev
# Run the electron app, which reads from the web server
yarn electron:dev
```

## Release Process

### Version bump

Run `yarn bump [major|minor|patch]` to bump the version number & create a new git commit, by default it will run `patch`.

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
