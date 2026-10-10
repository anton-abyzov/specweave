---
title: GitHub sync
description: Mirror SpecWeave increments to GitHub Issues with one explicit command, specweave sync push.
---

# GitHub sync

GitHub Issues is the first-class tracker. SpecWeave does not need it: the spec, the ledger and the verify report are the record, and the issue is a mirror for people who work in GitHub.

In 3.0 sync is explicit. Starting, pausing, resuming or abandoning an increment never touches GitHub. An issue is created or updated only when you run `specweave sync push`, and closed when you complete an increment that already has a linked issue.

Agents should go through `specweave sync` (or the `sync` skill that wraps it) and never call `gh` or the REST API directly. The CLI owns token resolution, duplicate detection and the links in both directions.

## Connect

```bash
specweave sync setup --provider github
specweave sync setup --validate        # re-check an existing setup
```

The wizard writes the provider block into `.specweave/config.json` and asks what SpecWeave may do. `sync push` creates a missing issue only when `sync.settings.canUpsertInternalItems` or `sync.settings.canUpdateExternalItems` is `true`. The wizard also sets `hooks.post_increment_done.close_external_issue`, which closes linked issues when an increment completes. Set it to `false` if you want `complete` to leave trackers alone.

`sync.enabled` is `false` in a fresh project, so nothing talks to GitHub until you run setup.

### Where the token comes from

First hit wins:

1. a token in `.specweave/config.json`
2. `GITHUB_TOKEN`, then `GH_TOKEN`, in the environment
3. `GITHUB_TOKEN` or `GH_TOKEN` in the project's `.env`
4. `gh auth token`

`specweave sync status` and `sync push` print which source won and which account it belongs to. A `.env` token outranks your `gh` login, so a repository you can push to from the terminal can still fail from SpecWeave.

A 404 on a write means the token's account has no write access to `owner/repo`. GitHub reports permission failures as 404. Fix the token; retrying will not help.

## Push

```bash
specweave sync push                     # the active increment
specweave sync push 0042                # one increment
specweave sync push 0042 --dry-run      # preview, write nothing
specweave sync push 0042 --no-create    # update only; never create a missing issue
specweave sync push 0042 --reconcile    # close stale or duplicate milestones first
specweave sync push 0042 --force        # push even when nothing looks changed
```

`push` creates the issue if it is missing and allowed, updates it, records the link in the increment's `metadata.json` under `externalLinks`, and then retries any earlier provider writes that failed. Push at milestones (after `verify`, before review, at close), not after every edit.

## Pull

```bash
specweave sync pull                       # report external changes from the last 7 days
specweave sync pull --since 30            # last 30 days (or an ISO date)
specweave sync pull --create-increments   # import issues as increments (interactive)
```

`pull` only reports; it never rewrites your spec or ledger. `--create-increments` is the import path and creates increment folders with the external link already set.

## Health

```bash
specweave sync status            # token source, account, can-push, provider health, retry queue, gaps
specweave sync status --json
specweave sync status --quick    # skip network probes
```

The exit code is 1 when something needs attention. Paste the output as it is when asking for help; token and permission messages are precise.

## Links in both directions

- Local to GitHub: the issue number lives in `metadata.json` under `externalLinks`.
- GitHub to local: the issue body carries the increment id.

Never edit `externalLinks` by hand. If a link looks wrong, run `specweave sync push <id> --force`.

## Known limits

The sync engine in 3.0 is the 2.x engine with the automatic triggers removed. It was built around the older user-story layout, so it mirrors a 3.0 single-file increment as one issue and does not yet reflect per-task progress well. A rewrite of sync around the ledger is planned for 3.1. Until then, treat the issue as a pointer to the increment, and the ledger and `reports/verify.json` as the source of truth.

## See also

- [Jira and Azure DevOps](/docs/guides/jira-ado-sync)
- [`specweave sync` reference](/docs/reference/sync-cli)
