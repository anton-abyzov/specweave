---
description: One sync surface for GitHub, Jira and Azure DevOps: push progress, pull or import issues, check health, run setup. Use when saying "sync", "push to GitHub", or "import issues".
version: 2.0.0
argument-hint: "push|pull|status|setup [increment-id]"
---

# sw:sync — external tracker sync

Everything goes through the CLI. Never call `gh`, `curl`, or a provider REST API
directly: the CLI owns token resolution, the rate budget, duplicate detection and
the bidirectional links.

## Commands

| Intent | Command |
|---|---|
| Push local progress to issues | `specweave sync push [increment-id]` |
| Preview a push | `specweave sync push <id> --dry-run` |
| Push to one provider | `specweave sync push <id> --provider github` |
| Fix stale/duplicate milestones first | `specweave sync push <id> --reconcile` |
| Report external changes | `specweave sync pull [--since 7]` |
| Import issues as increments | `specweave sync pull --create-increments` |
| Tokens, health, retry queue, gaps | `specweave sync status [--json]` |
| Connect a provider | `specweave sync setup [--provider github]` |
| Validate an existing config | `specweave sync setup --validate` |

`sync push` runs tasks.md → spec.md ACs → living docs → provider write, then
drains the retry queue through the same entry point. Exit code of
`sync status` is 1 when anything needs attention; `--json` prints one parsable
report (`providers`, `github`, `health`, `resilience`, `gaps`, `hasIssues`).

Not sync: `specweave doctor --fix-status` repairs metadata.json ↔ spec.md status
desyncs, and `specweave sync-living-docs` regenerates internal living docs.

## Providers

Read the provider from `.specweave/config.json` (`sync.github` / `sync.profiles`);
never guess. GitHub is the first-class path. **Jira and Azure DevOps are
community-maintained**: push and close work, nothing else is guaranteed — say so
before promising Jira/ADO behaviour.

Tokens resolve in one documented order: `.specweave/config.json` → `process.env`
(`GITHUB_TOKEN`, then `GH_TOKEN`) → project `.env` → `gh auth token`.
`sync status` prints which layer and which account won. A 404 on write means the
token's account has no write access to `owner/repo` — fix the token, do not retry.

Concept mapping tables: `plugins/specweave/reference/{github,jira,ado}/*-specweave-mapping.md`.

## Bidirectional links (required both ways)

- Local → external: the issue key lives in `metadata.json` under `externalLinks`.
- External → local: the issue body carries the increment id and the commit sha.

If either side is missing after a push, the link is broken — re-run
`specweave sync push <id> --force` rather than editing the issue by hand.

## Rules

1. Push after tasks change, not on every edit.
2. Never edit `externalLinks` by hand.
3. `--dry-run` first when the increment has never synced.
4. Report `sync status` output verbatim when it reports issues; do not paraphrase
   token or permission errors.
