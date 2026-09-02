---
title: GitHub sync
description: Connect SpecWeave increments to GitHub Issues — the first-class sync provider.
---

# GitHub sync

GitHub is the first-class sync provider. Everything goes through one CLI surface — `specweave sync` — or the `sw:sync` skill that wraps it. Never call `gh`, `curl` or the GitHub REST API directly from an agent: the CLI owns token resolution, the rate budget, duplicate detection and the bidirectional links.

## Connect

```bash
specweave sync setup --provider github
```

The wizard writes `sync.github` into `.specweave/config.json` and validates that your token can actually write to the repository. To re-check an existing setup without re-running the wizard:

```bash
specweave sync setup --validate
```

### Where the token comes from

Tokens resolve in one documented order, first hit wins:

1. `.specweave/config.json`
2. `process.env.GITHUB_TOKEN`, then `process.env.GH_TOKEN`
3. the project's `.env`
4. `gh auth token`

`specweave sync status` prints which layer won and which account it belongs to. This matters: a `.env` token silently outranks your `gh` login, so a repository you can push to from the terminal can still 404 from SpecWeave.

**A 404 on write means the token's account has no write access to `owner/repo`.** GitHub masks permission failures as 404s. Fix the token; do not retry.

## Push

```bash
specweave sync push                 # the active increment
specweave sync push 0042            # a specific increment
specweave sync push 0042 --dry-run  # preview, write nothing
specweave sync push 0042 --reconcile  # fix stale/duplicate milestones first
specweave sync push 0042 --force      # push even when nothing looks changed
```

`push` runs in a fixed order: `tasks.md` → the ACs in `spec.md` → living docs (only if `livingDocs` is enabled) → the provider write. Then it drains the retry queue through the same entry point.

Push after tasks change, not on every edit.

## Pull

```bash
specweave sync pull                       # report external changes, last 7 days
specweave sync pull --since 30            # last 30 days
specweave sync pull --create-increments   # import issues as increments (interactive)
```

`pull` is a report by default. `--create-increments` is the import path: it turns selected issues into `NNNN-slug` increment folders with `externalLinks` already populated.

## Health

```bash
specweave sync status            # tokens, account, can-push, provider health, retry queue, gaps
specweave sync status --json     # one parsable report
specweave sync status --quick    # skip network probes
```

The exit code is 1 when anything needs attention. The JSON report carries `providers`, `github`, `health`, `resilience`, `gaps` and `hasIssues`.

## Bidirectional links

A sync is only correct when both directions exist:

- **local → external** — the issue key lives in `metadata.json` under `externalLinks`.
- **external → local** — the issue body carries the increment id and the commit sha.

If either side is missing after a push, the link is broken: re-run `specweave sync push <id> --force`. Never edit `externalLinks` by hand.

## Mapping

| SpecWeave | GitHub |
|-----------|--------|
| Increment | Issue (optionally under a milestone) |
| Acceptance criteria | Checklist in the issue body |
| Tasks | Checklist items, updated on `sync push` |
| `complete` | Issue closed (when `sync` is enabled) |

## Configuration

```json
{
  "sync": {
    "enabled": true,
    "github": { "enabled": true, "owner": "my-org", "repo": "my-app" },
    "settings": { "autoSyncOnCompletion": true }
  }
}
```

`sync.enabled` is `false` by default — nothing talks to GitHub until you turn it on.

See also: [Jira and Azure DevOps](/docs/guides/jira-ado-sync) · [`specweave sync` reference](/docs/reference/sync-cli)
