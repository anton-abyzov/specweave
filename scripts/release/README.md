# Releasing SpecWeave

`bash scripts/release/release.sh patch` (or `minor`, `major`, `prerelease`, `X.Y.Z`; also `npm run release:cut -- patch`) is the release. It bumps a throwaway clone of develop (an `## [Unreleased]` section becomes the entry, otherwise the PRs landed since the last tag are listed; `--notes FILE` replaces the body), opens a `Release X.Y.Z` PR, waits only for Version Alignment and Test & Validate (and Publish Guard), admin-merges it as a merge commit, tags the merge commit, watches release.yml and verifies npm, the dist-tag, the GitHub Release and the live docs site in headless Chromium. `--dry-run` pushes nothing. A run takes 6-8 minutes: a tool that caps one command at 10 minutes runs it in the background, or resumes with `release.sh tag|watch|verify X.Y.Z`.

Merge rules: develop requires an approving review the owner cannot give himself, so feature PRs merge with `gh pr merge --squash --admin` and the release PR with `--merge --admin`. Push over HTTPS; SSH is broken on the maintainer's Mac.

What CI already proves: a patch or prerelease bump (only version fields, the CHANGELOG and the manifests) and a change confined to untested paths (docs-site/static, docs-site/src, metrics/, video/) skip the Test & Validate, Publish Guard and hooks steps while still reporting success. release.yml then refuses to publish unless Test & Validate really ran and passed on the tagged commit, or on an older develop commit that differs from it only in such files; `skip_ci_gate` on a manual run is for emergencies only. A green release.yml run has installed the published tarball into a clean directory and checked `specweave --version`, so the only follow-up is `npm view specweave version`. The live docs check is `node docs-site/scripts/verify-live.mjs --browser` (headless; screenshots to a temp directory). The PR review workflow sits in `.github/workflows/_disabled/` until its token is rotated; do not re-diagnose it.

Without local tools: bump the version, manifests and CHANGELOG in a reviewed PR, merge it, then run `gh workflow run release.yml --ref develop -f version=X.Y.Z` with that exact version; the workflow releases the existing commit. The bump-and-push form (`-f version_type=patch`) is refused while develop requires reviews. Pushing a `vX.Y.Z` tag on the merge commit publishes the same way. An older stable version is rejected against npm `latest`. No local npm token is needed or used.

## Workspace adoption validation

| Check | Command |
|---|---|
| Workspace behavior | `npx vitest run tests/unit/workspace-adoption` |
| Existing get behavior | `npx vitest run tests/unit/cli/commands/get.test.ts tests/unit/cli/helpers/get` |
| Context and handoff | `npx vitest run tests/unit/utils/find-project-root.test.ts tests/unit/core/session/nested-repos.test.ts tests/unit/core/session/handoff-all.test.ts` |

`src/core/workspace/` owns planning context and in-place checkout adoption. Reuse it instead of scanning arbitrary parent directories or initializing adopted children. Use `--workspace` for explicit CLI authority; native hooks inherit `SPECWEAVE_WORKSPACE`. Never change existing IDs or merge distinct checkouts solely because their remotes match.
