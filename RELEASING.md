# Releasing

All publishable packages live under the `@sublime-ui` scope and are versioned
**in lockstep** (a `fixed` group in `.changeset/config.json`) — they always share
one version. Releases are cut with [Changesets](https://github.com/changesets/changesets)
and published **manually** from a machine logged in to npm.

Published packages: `@sublime-ui/framework`, `@sublime-ui/library`,
`@sublime-ui/ui`, `@sublime-ui/desktop`, `@sublime-ui/devkit`. The repo root and
the `website/` docs app are **not** published (`private: true` / not a workspace).

## One-time setup

```bash
npm login                 # an account with publish rights to the @sublime-ui org
npm whoami                # confirm
```

## Cutting a release

1. **Describe your changes** as you work:

   ```bash
   npx changeset
   ```

   Pick the bump (patch / minor / major) and write a summary. Because the
   packages are a fixed group, selecting any one bumps them all together. Commit
   the generated `.changeset/*.md` file with your PR.

2. **Version + changelog** when ready to release:

   ```bash
   npx changeset version     # applies bumps, writes CHANGELOGs, updates package.json
   ```

   Review the diff and commit it (e.g. `chore(release): version packages`).

3. **Build, gate, and publish:**

   ```bash
   npm run build -ws --if-present
   npm run typecheck -ws --if-present
   npm test -ws --if-present
   npm run lint
   npm publish --workspaces --access public
   ```

   `publishConfig.access: public` is set on every package, so the scoped
   packages publish publicly. Use `npm publish --workspaces --dry-run` first to
   inspect the tarballs.

4. **Tag + push:**

   ```bash
   git push --follow-tags
   ```

## Notes

- The first release is **0.1.0** (pre-1.0: usable, API may still shift).
- `@sublime-ui/create-app` (the `npm create @sublime-ui/app` starter, sub-project
  #6) joins the same fixed group when it lands.
- Installs in this monorepo use `--legacy-peer-deps` (the React Native peer graph
  is strict); set `ELECTRON_SKIP_BINARY_DOWNLOAD=1` when you don't need the
  Electron runtime locally.
