# Publishing the package

The package is prepared for npm and can also be installed with pnpm. Both use the same npm registry artifact.

## Release prerequisites

- License: MIT. Copyright is attributed to TOberpaul; verify attribution when accepting external contributions.
- Confirm ownership of the current `@design-system` scope, or replace the package name and all import examples with an available name you own.
- Keep `private: true` until those decisions are complete. This deliberately prevents accidental publication.
- Confirm the version in package.json and package-lock.json, and record release changes.

## Validate the artifact

```sh
npm ci
npm run build
npm run check:mcp
npm pack --dry-run
npm pack
```

The `prepack` hook builds the library. The package contains built ESM, TypeScript declarations, CSS, the MCP executable and public guides. React integrations, website assets, credentials and development dependencies are excluded. The core and MCP have no runtime dependencies.

Install the resulting `.tgz` into a temporary consumer project and verify ESM imports and `motion-library-mcp`. CSS is available through `@design-system/motion/motion.css`. Browser APIs are needed only when creating an animation; importing the module is safe without a browser.

## Publish when ready

After the prerequisites are resolved, remove `private: true`, sign in to the npm account that owns the chosen name, then run:

```sh
npm publish --access public
```

Use npm's required authentication/2FA flow. No token is stored in this repository. A GitHub Pages deployment publishes only the website; it does not publish an npm version. Registry releases are separate, intentional versioned actions.
