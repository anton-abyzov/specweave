---
id: ledger
title: Ledger (ledger.jsonl)
sidebar_label: Ledger
description: The append-only ledger.jsonl that holds all task state for an increment - event types, format, claims, leases and merges.
---

# Ledger (ledger.jsonl)

The **ledger** is `ledger.jsonl` in an increment folder. It is the only place task state lives. Every claim, completion, release, skip and block is one line appended to it; lines are never edited or deleted. The current state of each task is worked out by reading the lines in time order.

Because it is a plain file in git, every tool on every account sees the same state: Claude Code, Codex, Cursor or a script.

## Format

One JSON object per line, UTF-8, LF line endings:

```json
{"t":"T-01","e":"claim","by":"claude@laptop","at":"2026-09-20T10:00:00Z"}
{"t":"T-01","e":"done","by":"claude@laptop","at":"2026-09-20T10:40:00Z","evidence":"npm test -- draft → exit 0\n12 passed\nHEAD a1b2c3d"}
{"t":"*","e":"handoff","by":"claude@laptop","at":"2026-09-20T11:05:00Z","note":"out of tokens"}
```

| Key | Meaning |
|---|---|
| `t` | Task id (`T-01`), or `*` for an event about the whole increment |
| `e` | Event type |
| `by` | Agent id, `<tool>@<host>` |
| `at` | ISO timestamp, UTC |
| `note` | Free text: a block or skip reason, a message |
| `evidence` | Proof for `done`: command output, commit sha |

## Event types

| Event | Effect |
|---|---|
| `claim` | The agent is working on the task. The earliest live claim wins. |
| `done` | Finished, with evidence. Required: a `done` without evidence is ignored. |
| `release` | The owner gives the task back; it is open again. |
| `block` | Stuck, with a reason in `note`. |
| `skip` | Will not be done, with a reason. Final. |
| `note` | A message for whoever works on this increment next (`specweave note`). |
| `session` | A tool session started working on the increment. |
| `handoff` | A session handed the increment off (`specweave handoff`). |
| `pickup` | A session picked up a pushed handoff (`specweave pickup`). |

These last four use `t: "*"` and never change a task's state.

## Writing to it

Normally through the CLI, which also checks the rules:

```bash
specweave task claim T-02
specweave task done T-02 --run "npm test -- restore"
specweave task release T-02
specweave task block T-03 --reason "needs the API key"
specweave task skip T-04 --reason "covered by T-02"
specweave note "restore endpoint renamed to /resume" 0042
```

A tool without the CLI can append a line itself, as `AGENTS.md` describes. Writes are single-line appends, so two agents in the same working tree do not corrupt each other's lines.

## Claims and leases

A claim lasts for the lease, 2 hours by default (`tasks.leaseHours` in config). A claim older than that is **stale** and anyone may take it over; the owner renews it by claiming again. A live claim held by someone else is refused unless you pass `--force`, and so is a claim whose `Files` overlap another live claim. `specweave handoff` releases your claims so the next session is not locked out.

## Merging

Different branches append different lines to the same file. `specweave init` adds this to `.gitattributes` so git keeps both sides automatically:

```
**/ledger.jsonl merge=union
```

If you ever resolve a ledger conflict by hand, keep every line from both sides and remove only the conflict markers. Order does not matter.

## Related

- [Increment](/docs/glossary/terms/increments)
- [Handoff](/docs/glossary/terms/handoff)
- [AC-ID](/docs/glossary/terms/ac-id): how the ledger decides when a criterion is met
- [Troubleshooting: tasks and the ledger](/docs/guides/troubleshooting#tasks-and-the-ledger)
