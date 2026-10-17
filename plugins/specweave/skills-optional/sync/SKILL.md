---
description: Sync SpecWeave increments with GitHub, Jira or Azure DevOps - push progress, pull or import issues, check token and health, run setup. Use for "sync", "push to GitHub", "import issues".
argument-hint: "push|pull|status|setup [increment-id]"
version: 3.0.0
---
<!-- Generated from skills/sw-sync/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-sync: external tracker sync

Sync is opt-in and explicit. Starting, pausing or completing an increment never calls a
tracker; only `specweave sync push` does (plus close-on-complete, when configured). Go
through the CLI, never `gh`, `curl` or a provider API directly: the CLI owns token
resolution, the rate budget, duplicate detection and the links in both directions.

## Commands

| Intent | Command |
|---|---|
| Push progress to issues | `specweave sync push [increment-id]` |
| Preview a push | `specweave sync push 0042 --dry-run` |
| One provider only | `specweave sync push 0042 --provider github` |
| Report external changes | `specweave sync pull [--since 7]` |
| Import issues as increments | `specweave sync pull --create-increments` |
| Token, account, health, retry queue | `specweave sync status [--json]` |
| Connect a provider | `specweave sync setup [--provider github]` |
| Check an existing setup | `specweave sync setup --validate` |

`sync status` exits 1 when anything needs attention.

## Providers

Read the provider from `.specweave/config.json`; never guess. GitHub is first-class.
Jira and Azure DevOps are supported and opt-in: push and close are covered, say so
before promising more.

Tokens resolve in one order: config, then `GITHUB_TOKEN` / `GH_TOKEN`, then the project
`.env`, then `gh auth token`. `sync status` prints which one won and for which account.
A 404 on write means that account cannot write to the repository: fix the token, do not
retry. Check a token exists without printing it.

## Rules

1. `--dry-run` first when an increment has never synced.
2. Never edit the issue links in `metadata.json` by hand; a broken link is fixed with
   `specweave sync push 0042 --force`.
3. Report `sync status` output as it is when it shows problems; do not paraphrase token
   or permission errors.

## Manual path (no CLI)

There is no manual sync. Update the issue yourself and put its URL in spec.md Problem so
the next agent can find it.
