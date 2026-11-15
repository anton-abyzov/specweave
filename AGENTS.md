# SpecWeave (this repository)

Source of the `specweave` npm package: a CLI plus a Claude Code plugin. The file SpecWeave writes into user projects is `src/templates/AGENTS.md.template`.

- Node 22. `npm ci`, then `npm run build`. The CLI runs from `dist/`, so rebuild before trying `node bin/specweave.js <cmd>`.
- CI runs `npm run test:unit` (`tests/unit/**`). Co-located `src/**/*.test.ts` files are not in CI; put new tests under `tests/unit/`.
- `skills/sw-*` is the one skill source; `npm run generate:skills` writes `plugins/specweave/skills/`. Never edit the copies.
- After adding or renaming a command or option: `node scripts/completions/generate.mjs`.
- `init` refuses to run inside the system temp directory; try it in a scratch folder elsewhere.
- Default branch is `develop`; PRs target it. Feature PRs merge with `gh pr merge --squash --admin`. Push over HTTPS.
- Release: `bash scripts/release/release.sh patch|minor|major|X.Y.Z` (6 to 8 minutes; run it in the background).
- Increment state lives only in `ledger.jsonl`; never write derived state back into markdown.
- Hooks stay fast and offline: no network, no Git in SessionStart, and a hook error never blocks the user's tool.
- Changing an increment's status never calls a tracker; only `specweave sync push` does.
- `src/core/workspace/` owns planning context and checkout adoption: reuse it, never scan parent directories, never merge checkouts because their remotes match.
- Files stay under 1,500 lines.
- Release internals, what CI proves and the workspace-adoption checks: `scripts/release/README.md`.
