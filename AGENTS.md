# SpecWeave (this repository)

This is the source of the `specweave` npm package: a CLI plus a Claude Code plugin that plans work as increments (`spec.md` + `ledger.jsonl`) and hands it between AI tools. This file is for anyone changing SpecWeave itself; the file SpecWeave writes into user projects is `src/templates/AGENTS.md.template`.

## Layout

| Path | What it is |
|---|---|
| `bin/specweave.js` | Commander entry; each command lazily imports `dist/src/cli/commands/<name>.js` |
| `src/cli/commands/` | One file per CLI command |
| `src/core/tasks/` | Task parser, `ledger.jsonl` fold, `task` board, verify, AC derivation |
| `src/core/session/` | `pickup`, `handoff` (doc, Git capture, `--push`, secret scrub) |
| `src/core/increment/` | Increment creation, metadata, status transitions |
| `src/core/hooks/handlers/` | Claude Code hook handlers, reached through `plugins/specweave/hooks/run.mjs` |
| `src/sync/`, `src/integrations/` | GitHub, Jira and ADO sync (opt-in, only on `specweave sync`) |
| `src/templates/` | What `init` and `update` write into user projects |
| `skills/sw-*` | The one skill source for every tool; `npm run generate:skills` writes the plugin copies in `plugins/specweave/skills/` (never edit those) |
| `docs-site/` | spec-weave.com (Docusaurus); deploys from `develop` |

## Work here

- Node 22. `npm ci`, then `npm run build` (tsc, dashboard, plugin copies). The CLI runs from `dist/`, so rebuild before trying a command: `node bin/specweave.js <cmd>`.
- Tests: `npm run test:unit` is what CI runs (`tests/unit/**`). Co-located `src/**/*.test.ts` files are not in CI; run them with `npx vitest run src/<path>` when you touch that code, and put new tests under `tests/unit/`.
- Typecheck with `npx tsc --noEmit -p .` before pushing.
- Adding or renaming a CLI command or option: regenerate completions with `node scripts/completions/generate.mjs`.
- `init` refuses to run inside the system temp directory; use a scratch folder elsewhere to try it.
- Keep files under 1,500 lines. Prefer deleting code to adapting it.
- Default branch is `develop`. PRs target `develop`.
- Browser tests and automation must use headless Chrome/Playwright CLI. Set `headless: true`, `PWDEBUG=0`, `PLAYWRIGHT_HTML_OPEN=never`, and HTML reports `open: 'never'`. Save captures to files and pass this rule to subagents. If a visible browser is essential, ask the user and wait for explicit approval before opening it; a headless failure is not approval.

## Workspace adoption validation

| Check | Command |
|---|---|
| Workspace behavior | `npx vitest run tests/unit/workspace-adoption` |
| Existing get behavior | `npx vitest run tests/unit/cli/commands/get.test.ts tests/unit/cli/helpers/get` |
| Context and handoff | `npx vitest run tests/unit/utils/find-project-root.test.ts tests/unit/core/session/nested-repos.test.ts tests/unit/core/session/handoff-all.test.ts` |

`src/core/workspace/` owns planning context and in-place checkout adoption. Reuse it instead of scanning arbitrary parent directories or initializing adopted children. Use `--workspace` for explicit CLI authority; native hooks inherit `SPECWEAVE_WORKSPACE`. Never change existing IDs or merge distinct checkouts solely because their remotes match.

## Releasing

`bash scripts/release/release.sh patch` (or `minor`, `major`, `prerelease`, `X.Y.Z`; also `npm run release:cut -- patch`) is the release. It bumps a throwaway clone of develop (an `## [Unreleased]` section becomes the entry, otherwise the PRs landed since the last tag are listed; `--notes FILE` replaces the body), opens a `Release X.Y.Z` PR, waits only for Version Alignment and Test & Validate (and Publish Guard), admin-merges it as a merge commit, tags the merge commit, watches release.yml and verifies npm, the dist-tag, the GitHub Release and the live docs site in headless Chromium. `--dry-run` pushes nothing. A run takes 6-8 minutes: a tool that caps one command at 10 minutes runs it in the background, or resumes with `release.sh tag|watch|verify X.Y.Z`.

Merge rules: develop requires an approving review the owner cannot give himself, so feature PRs merge with `gh pr merge --squash --admin` and the release PR with `--merge --admin`. Push over HTTPS; SSH is broken on the maintainer's Mac.

What CI already proves: a patch or prerelease bump (only version fields, the CHANGELOG and the manifests) and a change confined to untested paths (docs-site/static, docs-site/src, metrics/, video/) skip the Test & Validate, Publish Guard and hooks steps while still reporting success. release.yml then refuses to publish unless Test & Validate really ran and passed on the tagged commit, or on an older develop commit that differs from it only in such files; `skip_ci_gate` on a manual run is for emergencies only. A green release.yml run has installed the published tarball into a clean directory and checked `specweave --version`, so the only follow-up is `npm view specweave version`. The live docs check is `node docs-site/scripts/verify-live.mjs --browser` (headless; screenshots to a temp directory). The PR review workflow sits in `.github/workflows/_disabled/` until its token is rotated; do not re-diagnose it.

Without local tools: bump the version, manifests and CHANGELOG in a reviewed PR, merge it, then run `gh workflow run release.yml --ref develop -f version=X.Y.Z` with that exact version; the workflow releases the existing commit. The bump-and-push form (`-f version_type=patch`) is refused while develop requires reviews. Pushing a `vX.Y.Z` tag on the merge commit publishes the same way. An older stable version is rejected against npm `latest`. No local npm token is needed or used.

## Project notes

- Increment state lives only in `ledger.jsonl`. Never write derived state (checkboxes, board tables) back into markdown; a legacy `tasks.md` is read, and rewritten only by `specweave task render --write`.
- Hooks must stay fast and offline: no network, no Git in SessionStart, and a hook error must never block the user's tool.
- Changing an increment's status never calls a tracker. Only `specweave sync push` and the explicit close-on-complete setting do.
