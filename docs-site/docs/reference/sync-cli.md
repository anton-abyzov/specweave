---
title: specweave sync
description: CLI reference for specweave sync push, pull, status and setup, and when SpecWeave 3.0 touches GitHub, Jira or Azure DevOps.
---

# `specweave sync`

One command group for every external tracker, with four verbs:

```bash
specweave sync push [increment-id]
specweave sync pull
specweave sync status
specweave sync setup
```

GitHub is first-class. Jira and Azure DevOps are opt-in. The `sync` skill (`/sw:sync`, `$sw-sync`) is a thin wrapper over these commands. A larger rewrite of sync is planned for 3.1.

## When a tracker is touched

In 3.0, SpecWeave writes to a tracker only when you ask it to:

- `specweave sync push` creates or updates issues.
- `specweave complete` closes GitHub issues that `sync push` already linked to the increment. It closes Jira issues and Azure DevOps work items only when the close-on-complete setting is on (`hooks.post_increment_done.close_external_issue`, see [configuration](/docs/reference/configuration#hooks)).

Nothing else calls a tracker. Creating an increment, `start`, `pause`, `resume`, `abandon` and every `task` command stay local. There are no living docs.

## `specweave sync push [increment-id]`

Push local progress to the configured tracker. With no id, the active increment is used.

| Option | Effect |
|--------|--------|
| `--dry-run` | Show what would happen; write nothing. |
| `--provider <github\|jira\|ado>` | Push to one provider only. |
| `--no-create` | Do not create a missing issue; only update linked ones. |
| `--reconcile` | Clean up stale or duplicate GitHub milestones first. |
| `--force` | Push even when nothing changed. |

A missing issue is created only when `sync.settings.canUpsertInternalItems` or `sync.settings.canUpdateExternalItems` is `true`; `init` sets both when it finds a tracker. Issue numbers and URLs are stored in the increment's `metadata.json`. After the push, writes that failed earlier and were queued are retried.

## `specweave sync pull`

Report what changed on the tracker side, or import issues as increments.

| Option | Effect |
|--------|--------|
| `--since <date\|days>` | ISO date or number of days to look back. Default `7`. |
| `--provider <github\|jira\|ado>` | Pull from one provider only. |
| `--create-increments` | Create SpecWeave increments from external issues (interactive). |

## `specweave sync status`

One report: which GitHub token and account are in use and whether it can push, provider health, the retry queue, circuit breakers and sync gaps.

| Option | Effect |
|--------|--------|
| `--json` | Machine-readable report with `providers`, `github`, `health`, `resilience`, `gaps` and `hasIssues`. |
| `--provider <github\|jira\|ado>` | Report one provider only. |
| `--quick` | Skip network checks. |

Exit code 1 means something needs attention. Token and permission errors are precise; pass them on as printed.

## `specweave sync setup`

Interactive wizard to connect GitHub Issues, Jira or Azure DevOps.

| Option | Effect |
|--------|--------|
| `--provider <github\|jira\|ado>` | Skip the provider prompt. |
| `--validate` | Check the existing configuration and credentials instead of running the wizard. |
| `--quick` | Non-interactive: print a hint and exit. For CI. |

## GitHub token

The first one found wins:

1. A token in `.specweave/config.json`
2. `GITHUB_TOKEN`, then `GH_TOKEN`, in the environment
3. `GITHUB_TOKEN` or `GH_TOKEN` in the project's `.env`
4. `gh auth token` from the GitHub CLI

`specweave sync status` prints which source and which account were used, never the token.

## Related commands

| Command | Does |
|---------|------|
| `specweave link-pr --increment <id> --pr-url <url> --pr-number <n>` | Link a pull request to the increment's Jira or Azure DevOps ticket. |
| `specweave branch-name <id>` | Print the branch name for an increment, with the ticket key when one is linked. |
| `specweave doctor --fix-status` | Repair status mismatches between `metadata.json` and `spec.md`. Not a tracker operation. |

The `sync` config block is described in the [configuration reference](/docs/reference/configuration#sync). Setup walkthroughs: [GitHub sync](/docs/guides/github-sync) and [Jira and Azure DevOps](/docs/guides/jira-ado-sync).
