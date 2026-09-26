---
id: metadata-json
title: metadata.json
sidebar_label: metadata.json
description: The machine-state file of an increment - status, type, priority and timestamps, written only by the SpecWeave CLI.
---

# metadata.json

Every increment folder has a **`metadata.json`**. It is machine state: the increment's status, type and timestamps. The CLI writes it; people and agents do not edit it, and an agent does not need to read it to do the work. What to build is in [spec.md](/docs/glossary/terms/spec-md), and task progress is in the [ledger](/docs/glossary/terms/ledger).

## What `create-increment` writes

```json
{
  "id": "0042-keep-checkout-resumable",
  "status": "active",
  "type": "feature",
  "priority": "P1",
  "created": "2026-09-20T10:00:00.000Z",
  "updated": "2026-09-20T10:00:00.000Z",
  "lastActivity": "2026-09-20T10:00:00.000Z",
  "title": "Keep checkout resumable"
}
```

## Common fields

| Field | Meaning |
|---|---|
| `id` | Folder name, number plus slug. |
| `status` | `planned`, `active`, `paused`, `completed` or `abandoned`. |
| `type` | `feature`, `hotfix`, `bug`, `refactor` or `experiment` (`--type` on create). |
| `priority` | `P1`, `P2` or `P3` (`--priority` on create). |
| `created`, `updated` | ISO timestamps. `lastActivity` is kept in step for older readers. |
| `title` | The title given on create. |
| `pausedReason`, `abandonedReason` | Set by `specweave pause --reason` and `specweave abandon --reason`. |
| `closeReason` | Why it was closed without a passing verify (`specweave complete --reason`), or which increment superseded it. |
| `supersedes`, `parent` | Set by `--supersedes` and `--parent` on create. |
| `project`, `board` | Routing for multi-repo workspaces, when configured. |

Links to external issues (`github`, `jira`, `ado` objects) appear only after you run `specweave sync push`. See the [metadata reference](/docs/reference/metadata-reference) for every field.

## Changing the status

Use the commands, never an editor:

```bash
specweave start 0042
specweave pause 0042 --reason "waiting on API keys"
specweave resume 0042
specweave abandon 0042 --reason "no longer needed"
specweave complete 0042
```

Claiming the first task (`specweave task claim`) also moves a `planned` increment to `active`.

If an older increment's `spec.md` frontmatter disagrees with `metadata.json`, `specweave doctor --fix-status` rewrites the spec to match; `metadata.json` wins.

## Related

- [Increment](/docs/glossary/terms/increments)
- [Increment status reference](/docs/guides/increment-status-reference)
- [Metadata reference](/docs/reference/metadata-reference)
