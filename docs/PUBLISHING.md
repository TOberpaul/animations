# Publishing the package

The package is prepared for npm and can also be installed with pnpm. Both use the same npm registry artifact.

## Release prerequisites

- License: MIT. Copyright is attributed to TOberpaul; verify attribution when accepting external contributions.
- Sign in to npm with publish access to the `@tobiasoberpaul` scope. Check the account with `npm whoami`.
- Confirm the version in package.json and package-lock.json, and record release changes.

## Validate the artifact

```sh
npm ci
npm run build
npm pack --dry-run
npm pack
```

The `prepack` hook builds the library. The package contains built ESM, TypeScript declarations, CSS, the library guide, the consumer README and the MIT license. The library has zero runtime dependencies.

Install the resulting `.tgz` into a temporary consumer project and verify the ESM and CSS exports. CSS is available through `@tobiasoberpaul/mdk/motion.css`. Browser APIs are needed when creating an animation. Importing the module works without a browser.

## Publish when ready

After validation, publish `@tobiasoberpaul/mdk` to the public npm registry:

```sh
npm publish --access public
```

Use npm's required authentication/2FA flow. No token is stored in this repository. A GitHub Pages deployment publishes only the website; it does not publish an npm version. Registry releases are separate, intentional versioned actions.
