---
title: Jira and Azure DevOps
description: Jira and Azure DevOps as opt-in sync providers — what works, and what does not.
---

# Jira and Azure DevOps

:::warning Opt-in, community-maintained
GitHub is the first-class provider. **Jira and Azure DevOps support push and close. Nothing beyond that is guaranteed.** If an agent promises richer Jira or ADO behaviour, it is guessing.
:::

SpecWeave 2.0 removed the 1.x Jira/ADO stacks for multi-project routing, hierarchy mapping and per-project field mapping, along with the per-provider `sw-jira:` / `sw-ado:` command namespaces. What remains is the same `specweave sync` surface as GitHub, pointed at a different provider.

## Connect

```bash
specweave sync setup --provider jira
specweave sync setup --provider ado
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

Both providers default to `enabled: false`. Validate an existing config with `specweave sync setup --validate`.

## Use

Every verb takes `--provider` so a multi-provider project stays explicit:

```bash
specweave sync push 0042 --provider jira
specweave sync push 0042 --provider ado --dry-run
specweave sync pull --provider jira --since 14
specweave sync status --provider ado
```

Closing an increment closes the linked work item when `sync.enabled` is true and the provider block is enabled.

## Mapping

| SpecWeave | Jira | Azure DevOps |
|-----------|------|--------------|
| Increment | Issue | Work item |
| Acceptance criteria | Description checklist | Description checklist |
| Tasks | Checklist items | Checklist items |
| `complete` | Issue transitioned to Done | Work item closed |

Increment ids and commit shas go into the issue body; the issue key comes back into `metadata.json` under `externalLinks`. Do not edit either side by hand.

## What was removed in 2.0

| Removed | Replacement |
|---------|-------------|
| `sw-jira:*`, `sw-ado:*` command namespaces | `sw:sync` / `specweave sync --provider …` |
| Jira/ADO multi-project routing and board import | Not supported. One project per repository. |
| Hierarchy mapping (epic → story → task levels) | Not supported. Increment → issue, flat. |
| Per-project field mapping configuration | Not supported. |
| Queued sync mode (`sync.mode: "queued"`) | Removed — it dropped events on a partial flush. Sync is now a direct call that fails visibly. |

If you depended on any of these, keep the increments and drive the tracker manually; SpecWeave will not silently half-sync them.

See also: [GitHub sync](/docs/guides/github-sync) · [`specweave sync` reference](/docs/reference/sync-cli)
