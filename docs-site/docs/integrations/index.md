---
title: Optional integrations
sidebar_label: Integration ownership
---

# Integration ownership

SpecWeave's local work record does not require a tracker. GitHub, Jira, and Azure DevOps are optional delivery mirrors for teams that already use them.

## Current behavior

`specweave sync setup` configures a provider and target. `sync status` reports integration state. `sync push <increment-id>` publishes local progress through the configured provider. `sync pull <increment-id>` reports external changes; it does not merge them into local files.

| Field | Recommended authority |
|---|---|
| Acceptance criteria and task evidence | Local specification and ledger |
| Verified increment completion | CLI verification and completion commands |
| Priority, assignee, planning labels | Team's established tracker workflow |
| External link | Explicit provider + project + item identity |

A remote issue being closed does not satisfy local verification. Resolve disagreements explicitly instead of marking unverified implementation complete.

## Recommended rollout

Start with one repository and a disposable project. Check target routing and permissions, push a milestone, inspect the resulting issue, retry, and check for duplicates. Exercise reopened issues, authentication failures, partial writes, and rate limits before organization-wide use.

Keep sync explicit at milestones. The integration layer should not drive every tool call or add periodic model inference. For new reconciliation work, prefer content hashes, idempotent updates, recorded checkpoints, visible errors, and conflict previews. These are design requirements for future changes, not a claim that every existing provider path already implements them.

## Guides

- [GitHub sync](/docs/guides/github-sync)
- [Jira and Azure DevOps](/docs/guides/jira-ado-sync)
- [Sync CLI reference](/docs/reference/sync-cli)
- [Product integration overview](/integrations)
