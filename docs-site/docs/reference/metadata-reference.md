---
sidebar_position: 5
title: Metadata and ledger
description: The machine files in an increment folder in SpecWeave 3.0 - metadata.json, the ledger.jsonl event format, and the reports.
---

# Metadata and ledger reference

An increment is a folder, `.specweave/increments/NNNN-slug/`. You write `spec.md`. The CLI writes everything else. Agents do not need to read `metadata.json`; `specweave pickup` and `specweave task next` give them what they need.

## Files in an increment folder

| File | Written by | Holds |
|------|-----------|-------|
| `spec.md` | You or the agent | Problem, Scope, Acceptance Criteria, Approach, Open questions, Tasks. |
| `metadata.json` | The CLI | Status, type, timestamps, tracker links. |
| `ledger.jsonl` | `specweave task`, `note`, `handoff`, `pickup` | Every claim, completion and message, one JSON object per line. The only task state. |
| `plan.md` | `create-increment --with-plan` | Optional long design notes. |
| `rubric.md` | `specweave generate-rubric` | Optional quality contract tied to the acceptance criteria. |
| `handoff.md`, `handoff.diff` | `specweave handoff` | The last handoff and the uncommitted diff at that moment. |
| `reports/verify.md`, `reports/verify.json` | `specweave verify` | Test, lint and build results. `complete` checks `verify.json`. |
| `reports/task-T-01.log` | `task done --run` | Full output of the task's test command. |
| `reports/handoff-report.html` | `specweave report`, `handoff`, `pickup` | HTML timeline of who did what: tools, sessions, handoffs, pickups and evidence. |
| `tasks.md` | 2.x only | Task definitions in increments created before 3.0. Still read. |

## metadata.json

`specweave create-increment` writes this:

```json
{
  "id": "0042-add-login-form",
  "status": "active",
  "type": "feature",
  "priority": "P1",
  "created": "2026-09-20T09:12:00.000Z",
  "updated": "2026-09-20T09:12:00.000Z",
  "lastActivity": "2026-09-20T09:12:00.000Z",
  "title": "Add login form",
  "project": "my-app"
}
```

Never edit `status` by hand. Use `start`, `pause`, `resume`, `abandon` and `complete`.

### Fields

| Field | Notes |
|-------|-------|
| `id` | Folder name, such as `0042-add-login-form`. |
| `status` | See the statuses below. |
| `type` | `feature` (default), `bug`, `hotfix`, `refactor`, `change-request` or `experiment`. |
| `priority` | `P1` by default; set with `--priority`. |
| `created` | ISO timestamp. |
| `updated` | Last change. Every ledger append also updates it. `lastActivity` is the same value, kept for 2.x increments. |
| `title` | The title given to `create-increment`. |
| `project`, `board` | Which workspace repo or board the increment belongs to, when there is more than one. |
| `planning.parallel` | Present when created with `--parallel`. |
| `testMode`, `coverageTarget` | Per-increment overrides of the `testing` config. Filled in with defaults when missing. |
| `externalLinks` | Tracker issue numbers and URLs, written by `specweave sync push` or an import. Never hand-edit. |

### Lifecycle fields

Set by the CLI during status changes:

| Field | Set when |
|-------|----------|
| `pausedAt`, `pausedReason` | `specweave pause` |
| `abandonedAt`, `abandonedReason` | `specweave abandon` |
| `approvedAt` | `specweave complete` |
| `readyForReviewAt` | `complete` passes through `ready_for_review` on the way to `completed`. |
| `closeReason` | `complete --reason`, or when another increment supersedes this one. |
| `supersedes` | `create-increment --supersedes NNNN`. The old increment is abandoned with `closeReason: "superseded by <new id>"`. |
| `parent` | `create-increment --parent NNNN`. |

### Statuses

| Status | Meaning |
|--------|---------|
| `planned` | Spec exists, work has not started. `create-increment --planned` or an import. |
| `active` | Being worked on. The default for a new increment, and what `task`, `verify` and `handoff` use when you give no id. |
| `paused` | Stopped for now. |
| `completed` | Closed by `specweave complete`. |
| `abandoned` | Dropped or superseded. |

`backlog` and `ready_for_review` are 2.x states that still load. Older spellings are mapped when read: `planning`, `new` and `todo` become `planned`; `in_progress` and `started` become `active`; `done` and `closed` become `completed`; `cancelled` and `superseded` become `abandoned`. See the [increment status reference](/docs/guides/increment-status-reference).

## ledger.jsonl

The ledger is append-only. Each line is one JSON object, UTF-8, LF line endings:

```json
{"t":"T-01","e":"claim","by":"claude@laptop","at":"2026-09-20T10:00:00.000Z"}
{"t":"T-01","e":"done","by":"claude@laptop","at":"2026-09-20T10:40:00.000Z","evidence":"npm test -- login → exit 0\n12 passing"}
{"t":"*","e":"note","by":"codex@cloud","at":"2026-09-20T11:05:00.000Z","note":"Staging API key rotated; ask before running e2e"}
{"t":"*","e":"handoff","by":"claude@laptop","at":"2026-09-20T12:00:00.000Z","note":"out of tokens · next: T-02 restore draft"}
{"t":"*","e":"pickup","by":"codex@cloud","at":"2026-09-20T12:10:00.000Z","note":"from claude@laptop, snapshot 3f9c2a1"}
```

| Key | Required | Meaning |
|-----|----------|---------|
| `t` | yes | Task id such as `T-01`, or `*` for an increment-level event. |
| `e` | yes | Event type, below. |
| `by` | yes | Agent id. |
| `at` | yes | ISO 8601 timestamp. |
| `note` | for `skip` and `block` | Reason or message. |
| `evidence` | for `done` | Commit sha, test command and output tail. |

Lines that do not parse are counted and skipped, never fatal. A byte-order mark and CRLF endings are tolerated.

### Task events

| Event | Effect |
|-------|--------|
| `claim` | The task becomes claimed by `by`. Ignored if someone else holds a claim that is still within the lease; the earliest claim wins. |
| `done` | The task is done. Ignored without `evidence`, or if someone else holds a live claim. |
| `release` | The owner gives the task back; it becomes open. |
| `block` | The task is blocked, with a reason in `note`. |
| `skip` | The task will not be done. Final. Ignored without a `note`. |

A claim older than the lease (`tasks.leaseHours`, default 2 hours) is stale, and another agent may take the task over. Task state is derived by sorting events by time and replaying them, so the order of lines in the file does not matter.

An acceptance criterion counts as met when every task that lists it under `AC:` is done. Nobody ticks boxes in `spec.md`.

### Increment events

These use `"t": "*"` and never change task state.

| Event | Written by |
|-------|-----------|
| `note` | `specweave note "<text>"`. A message for whoever works on the increment next. |
| `session` | `task claim`, `task done` and `pickup`, once per tool session, when the tool exposes a session id. |
| `handoff` | `specweave handoff`. `note` carries the reason and the next step. |
| `pickup` | `specweave pickup` when it applies a handoff. `note` says who it came from and which snapshot. |

`pickup` shows the latest notes and the last handoff. Secrets are scrubbed from `note` and `handoff` text before they are written.

### Agent id

`by` is `<tool>@<host>`, for example `claude@laptop`, `codex@build-box` or `claude@cloud`. The tool is detected from the environment (Claude Code, Codex, Grok, Cursor, Gemini CLI, Copilot, OpenCode; `cli` otherwise). Cloud sessions use `cloud` as the host so a new container keeps its own claims. Override with `SPECWEAVE_TOOL` and `SPECWEAVE_HOST`, or set the whole id with `SPECWEAVE_AGENT`. `specweave task whoami` prints it.

### Writing the ledger without the CLI

Any tool can append a line itself:

```bash
echo '{"t":"T-01","e":"claim","by":"grok@laptop","at":"2026-09-20T10:00:00Z"}' >> .specweave/increments/0042-add-login-form/ledger.jsonl
```

Appends are single-line writes, so two agents in one working tree do not corrupt each other. Across branches, `.gitattributes` sets `**/ledger.jsonl merge=union`, so a merge keeps every line from both sides. See [cross-tool handoff](/docs/guides/cross-tool-handoff) for the full multi-agent flow.
