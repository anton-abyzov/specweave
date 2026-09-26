---
title: Jira and Azure DevOps
description: Jira and Azure DevOps as opt-in sync providers in SpecWeave 3.0, what they do, and what they do not.
---

# Jira and Azure DevOps

:::warning Opt-in
GitHub is the first-class provider. Jira and Azure DevOps are supported and opt-in: SpecWeave can create a work item for an increment, update it on `sync push`, and close it when the increment completes. Nothing beyond that is promised. If an agent offers richer Jira or Azure DevOps behaviour, it is guessing.
:::

Both providers use the same `specweave sync` commands as GitHub, with `--provider` to pick the target. As with GitHub, 3.0 never syncs on a status change: only `specweave sync push` and the close-on-complete setting touch the tracker.

## Connect

```bash
specweave sync setup --provider jira
specweave sync setup --provider ado
specweave sync setup --validate
```

The wizard writes the provider block into `.specweave/config.json`:

```json
{
  "sync": {
    "enabled": true,
    "jira": { "enabled": true, "domain": "acme.atlassian.net", "projectKey": "APP" }
  }
}
```

```json
{
  "sync": {
    "enabled": true,
    "ado": { "enabled": true, "organization": "acme", "project": "Platform" }
  }
}
```

Both providers default to `enabled: false`. Keep credentials in the environment or in the project's `.env`, never in `config.json`, and check them with `specweave sync setup --validate` or `specweave sync status --provider jira`.

## Use

```bash
specweave sync push 0042 --provider jira
specweave sync push 0042 --provider ado --dry-run
specweave sync pull --provider jira --since 14
specweave sync status --provider ado
```

`--provider` accepts `github`, `jira` or `ado`. Without it, `push` writes to every enabled provider.

Closing an increment with `specweave complete` closes the linked work item when `hooks.post_increment_done.close_external_issue` is `true`. The setup wizard turns it on; set it to `false` to keep closure local.

Two helper commands exist for teams that key branches and pull requests to tickets:

```bash
specweave branch-name 0042          # branch name, with the ticket key when one is linked
specweave link-pr --increment 0042 --pr-url <url> --pr-number <n>
```

## What is not supported

| Not supported | What to do instead |
|---|---|
| Multi-project routing and board import | One tracker project per repository, or per repo in a workspace |
| Epic, story and task hierarchy mapping | One work item per increment |
| Per-project field mapping | Set fields in the tracker |
| Sync on start, pause, resume or abandon | Run `specweave sync push` when you want the tracker updated |

The 1.x `sw-jira:*` and `sw-ado:*` command namespaces are gone; use `specweave sync ... --provider`. A rewrite of sync around the 3.0 ledger is planned for 3.1 and will revisit what Jira and Azure DevOps receive.

## See also

- [GitHub sync](/docs/guides/github-sync)
- [`specweave sync` reference](/docs/reference/sync-cli)
