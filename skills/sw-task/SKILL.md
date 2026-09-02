---
description: Claim, finish, skip and release SpecWeave tasks via the append-only ledger so many agents share one increment. Use for "claim a task", "mark task done", "what next", "who owns T-03".
argument-hint: "<list|next|claim|done|skip|release|block> [T-id] [increment-id]"
version: "2.0.0"
---

# sw-task — the SpecWeave task ledger

Task state lives in `.specweave/increments/<id>/ledger.jsonl`: an append-only
JSONL file that any agent, from any vendor, can write. `tasks.md` holds the task
DEFINITIONS; the ledger holds the STATE. Never edit a ledger line — append.

**Two paths, one file format.** Run `specweave --version`:
exit 0 → **CLI path** (accelerator). Command not found → **manual path**.
Both produce byte-identical ledger lines.

## Formats (copy verbatim)

Task definition in `tasks.md` — header + one field line:

```markdown
### T-01 Fold the ledger
- AC: AC-01, AC-02 | Files: src/a.ts, src/a.test.ts | Test: npm test -- a
```

`Files:` is the ownership unit: claim the task that owns a file before editing it.

Ledger line — one JSON object per line, keys in this order:

```json
{"t":"T-01","e":"claim","by":"codex@mbp","at":"2026-09-02T10:00:00Z","note":"optional","evidence":"optional"}
```

- `t` task id · `e` one of `claim` `done` `release` `block` `skip` · `by` agent id · `at` ISO-8601 UTC.
- `note` is REQUIRED for `skip` and `block`. `evidence` is REQUIRED for `done` (test result and/or commit sha).
- UTF-8 **without BOM**, one object per line, `\n`-terminated. Blank, malformed and BOM-prefixed lines are skipped and counted, never fatal.
- Agent id = `SPECWEAVE_AGENT` if set, else `<tool>@<short-hostname>` (e.g. `codex@mbp`).

## Derived state (how to read the ledger)

Sort events by `at` (ties: smaller `by` first), then apply per task:

| Event | Accepted when | Result |
|---|---|---|
| `claim` | task open, or held by you, or the holder's claim is older than the 2h lease | `claimed by <you>` |
| `done` | has `evidence`, and you hold it / it is open / the claim is stale | `done` (terminal) |
| `release` | you are the holder | `open` |
| `block` | open or held by you | `blocked` + reason |
| `skip` | has `note`, not already done/skipped | `skipped` (terminal) |

Earliest live claim wins; a claim with no `done` after **2 hours** is stale and
may be taken over. A task with no ledger events is `open`.

## CLI path

```bash
specweave task next   [<inc>]                 # first open task, deps met, no Files conflict
specweave task claim  T-01 [<inc>]            # exit 3 lost race · 4 Files overlap · 6 deps unmet
specweave task done   T-01 [<inc>] --run "npm test -- a"   # exit 5 = command failed, stays open
specweave task done   T-01 [<inc>] --evidence "<sha> + what you ran"
specweave task skip   T-01 [<inc>] --note "<why>"
specweave task block  T-01 [<inc>] --note "<what is missing>"
specweave task release T-01 [<inc>]   |   specweave task release --all-mine
specweave task list   [<inc>] [--json]        # table + counts
specweave task render [<inc>]                 # refresh the SW:BOARD block in tasks.md
specweave task whoami                         # your agent id
```

`<inc>` may be omitted when exactly one increment is `active`. `done` runs the
task's `Test:` command when `--run` is omitted and stores its exit code plus the
last output lines as evidence; it auto-claims a task nobody holds.

## Manual path (no CLI)

1. Read `tasks.md` for the definitions and `ledger.jsonl` for the state; pick the lowest open `T-id` whose `Files:` nobody holds.
2. Append the event. Timestamp: `date -u +%Y-%m-%dT%H:%M:%SZ` (bash) / `(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')` (PowerShell).

bash / zsh:

```bash
L=.specweave/increments/0042-slug/ledger.jsonl
printf '%s\n' '{"t":"T-01","e":"claim","by":"codex@mbp","at":"2026-09-02T10:00:00Z"}' >> "$L"
```

PowerShell — always `[IO.File]::AppendAllText`, never `>>` (it writes UTF-16 with a BOM):

```powershell
$L = '.specweave\increments\0042-slug\ledger.jsonl'
$line = '{"t":"T-01","e":"claim","by":"codex@win","at":"2026-09-02T10:00:00Z"}'
[IO.File]::AppendAllText($L, $line + "`n", [Text.UTF8Encoding]::new($false))
```

3. Run the task's `Test:` command yourself, commit with the increment id in the subject (`0042: …`), then append the `done` line — evidence is what makes it believable:

```
{"t":"T-01","e":"done","by":"codex@mbp","at":"2026-09-02T11:30:00Z","evidence":"npm test -- a → exit 0 (14 passed) / a1b2c3d"}
```
4. Leave `tasks.md` alone in this path — a later `specweave task render` rewrites its state lines and the `<!-- SW:BOARD -->` table from the ledger.

## Rules

- Claim before you edit; edit only files listed in that task's `Files:`. Need another file → claim its task, or add a task.
- Append only. Never rewrite, reorder or delete lines; never touch another agent's task.
- On a git conflict in `ledger.jsonl`, keep **every** line from both sides (init writes `**/ledger.jsonl merge=union` to `.gitattributes`).
- `done` without a fresh passing test run is a lie the next agent pays for.
- Stopping for any reason: release your claims (`specweave task release --all-mine`, or append a `release` line per task) and write a handoff (`sw-handoff`).

## Related

- `sw-do` — the implementation loop that drives these commands.
- `sw-handoff` — portable handoff when you stop or switch tools.
