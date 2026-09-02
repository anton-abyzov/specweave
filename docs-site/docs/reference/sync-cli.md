---
title: specweave sync
description: CLI reference for the single external-tracker sync surface.
---

# `specweave sync`

One command group for every external tracker. Four verbs: `push`, `pull`, `status`, `setup`.

```
specweave sync <verb> [options]
```

The `sw:sync` skill is a thin wrapper over these commands.

---

## `specweave sync push [increment-id]`

Push local progress to the configured tracker(s). With no id, the active increment is used.

| Option | Effect |
|--------|--------|
| `--dry-run` | Preview; write nothing. |
| `--provider <github\|jira\|ado>` | Push to one provider only. |
| `--reconcile` | Reconcile stale or duplicate GitHub milestones before pushing. |
| `--no-create` | Do not auto-create a missing external issue. |
| `--force` | Push even when no change is detected. |

Order of operations: `tasks.md` → `spec.md` ACs → living docs (when enabled) → provider write → retry-queue drain.

---

## `specweave sync pull`

Report external changes, and optionally import them.

| Option | Effect |
|--------|--------|
| `--since <date\|days>` | ISO date or number of days to look back. Default `7`. |
| `--provider <github\|jira\|ado>` | Pull from one provider only. |
| `--create-increments` | Create SpecWeave increments from external issues (interactive). |

---

## `specweave sync status`

Token source, account, can-push, provider health, retry queue, circuit breakers and sync gaps.

| Option | Effect |
|--------|--------|
| `--json` | One parsable report: `providers`, `github`, `health`, `resilience`, `gaps`, `hasIssues`. |
| `--provider <github\|jira\|ado>` | Report one provider only. |
| `--quick` | Skip network probes. |

**Exit code 1** means something needs attention. Report the output verbatim — token and permission errors are precise and should not be paraphrased.

---

## `specweave sync setup`

Interactive wizard to connect a provider.

| Option | Effect |
|--------|--------|
| `--provider <github\|jira\|ado>` | Skip the provider selection prompt. |
| `--validate` | Validate the existing configuration and credentials instead of running the wizard. |
| `--quick` | Non-interactive: print a hint and exit (for CI). |

---

## Token resolution

First hit wins:

1. `.specweave/config.json`
2. `GITHUB_TOKEN`, then `GH_TOKEN` in the environment
3. the project `.env`
4. `gh auth token`

`specweave sync status` prints which layer and which account won.

---

## Config keys read by sync

```json
{
  "sync": {
    "enabled": false,
    "direction": "bidirectional",
    "autoSync": false,
    "defaultProfile": "…",
    "github": { "enabled": true, "owner": "…", "repo": "…" },
    "jira":   { "enabled": false, "domain": "…", "projectKey": "…" },
    "ado":    { "enabled": false, "organization": "…", "project": "…" },
    "settings": { "autoSyncOnCompletion": true }
  }
}
```

`sync.mode` was removed in 2.0 — the queued event-queue path dropped events on a partial flush. The config migrator deletes the key.

---

## Not sync

Two neighbouring commands that are often confused with sync:

| Command | Does |
|---------|------|
| `specweave doctor` | Health check, including `metadata.json` ↔ `spec.md` status desyncs. |
| `specweave sync-living-docs [id]` | Regenerates internal living docs (only meaningful when `livingDocs` is enabled). |

See also: [GitHub sync](/docs/guides/github-sync) · [Jira and Azure DevOps](/docs/guides/jira-ado-sync)
