---
name: mdk-release
description: Prepare or publish an MDK npm release while keeping the package guide, public website, and hosted MCP reference on the same version. Use for MDK version bumps and release requests.
---

# MDK release

1. Identify the release changes and target version. Check the registry, working tree, and remote branch. Keep unrelated work out of the release. Update `package.json` and its lockfile together.
2. Update the package README and `docs/LIBRARY.md` where the public API or guidance changed. Update the relevant pages in `examples/docs/` from the same release changes. Check install commands, examples, migration guidance, and the hosted MCP setup where relevant. Keep the npm README focused on library use.
3. Build with `npm run build:site`, run the relevant regression tests and `npm run check:mcp`, and inspect `npm pack --dry-run`. The npm artifact should contain library code, types, CSS, license and library documentation. Check that the changed website content is present in generated HTML. Build the hosted reference with `node scripts/build-mcp-edge.mjs` from the same version and source.
4. For an authorized release, publish the npm package and verify the version in the public registry. If npm prompts for browser authentication, keep the publish process running while the user approves it. Check the registry before retrying a publish.
5. Ship the release source and docs together. GitHub Pages deploys from `main` via `.github/workflows/pages.yml`. Verify the deployment corresponds to the release commit and that the updated pages are publicly readable. Deploy the matching Supabase MCP bundle using `docs/AI_INTEGRATION.md`. Verify its public endpoint reports the released version and returns the updated guide. Use the release authorization for the requested destinations and surface any remaining access or approval requirement.

Report the verified npm version, website, and MCP status separately. If a step fails after publication, keep the published version and resume from the failed step. A preparation request ends with locally verified artifacts.
