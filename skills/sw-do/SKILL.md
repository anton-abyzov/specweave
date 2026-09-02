---
description: Implement a SpecWeave increment task by task through the ledger, with evidence per task and a verified close. Use for "implement this", "start working", "continue the increment", "keep going".
argument-hint: "[increment-id]"
version: "2.0.0"
---

# sw-do — work an increment to done

One loop: pick a task, claim it, implement inside its `Files:`, prove it with a
test, record the evidence. Repeat until nothing is claimable, then verify and
close. State is the ledger (`sw-task`); the spec is the contract.

Run `specweave --version`: exit 0 → **CLI path**. Not found → **manual path**
(same files, appended by hand — see `sw-task`).

## Pick the increment

No id given → the single increment whose `metadata.json` has `status: active`.
Several active → list them and ask which. None → run `sw-increment` first.

## The loop

1. **Next** — `specweave task next <inc>`: the first open task whose deps are done and whose `Files:` no live claim holds.
   Manual: lowest open `T-id` in `tasks.md` with no live claim in `ledger.jsonl`.
2. **Claim** — `specweave task claim T-01 <inc>` (exit 3 = someone owns it, pick another · 4 = Files overlap · 6 = deps unmet).
   Manual: append `{"t":"T-01","e":"claim","by":"<agent>","at":"<ISO>"}`. Never edit before claiming.
3. **Read** — the task's `AC:` ids in `spec.md` and its `Files:`. Read the Approach section for that scope only; do not re-read the whole repo.
4. **Implement** — inside that task's `Files:` and nothing else. Need another file → claim the task that owns it, or add a task:
   `### T-07 Title` + `- AC: AC-03 | Files: src/b.ts | Test: npm test -- b`.
5. **Prove** — run the task's `Test:` command. Red → fix; never continue past a failing test.
6. **Commit** — subject starts with the increment id: `git commit -m "0042: fold the ledger"`.
7. **Done with evidence** — `specweave task done T-01 <inc> --run "npm test -- a"`
   (exit 5 = the command failed, task stays open). No `Test:` → `--evidence "<sha> + what you ran"`.
   Manual: append `{"t":"T-01","e":"done","by":"<agent>","at":"<ISO>","evidence":"npm test -- a → exit 0 / <sha>"}`.
8. **Stuck / not needed** — `task block T-01 --note "<what is missing>"` or `task skip T-01 --note "<why>"` (skip is terminal and needs a reason).
9. Back to 1.

## No CLI? Same loop, appended by hand

`ledger.jsonl` is the only state; append one line per event (full protocol in `sw-task`):

```bash
printf '%s\n' '{"t":"T-01","e":"claim","by":"codex@mbp","at":"2026-09-02T10:00:00Z"}' \
  >> .specweave/increments/0042-slug/ledger.jsonl
```

```powershell
$L = '.specweave\increments\0042-slug\ledger.jsonl'
$line = '{"t":"T-01","e":"done","by":"codex@win","at":"2026-09-02T11:30:00Z","evidence":"npm test -- a → exit 0 / a1b2c3d"}'
[IO.File]::AppendAllText($L, $line + "`n", [Text.UTF8Encoding]::new($false))
```

PowerShell never uses `>>` here: it writes UTF-16 with a BOM and the line is unreadable to every other tool.

## Finish (do not stop to ask)

When every task is `done` or `skipped`:

1. `specweave verify <inc>` — runs the project's test/lint/build commands (config `testing.commands`, else auto-detected), checks the ACs in `spec.md`, writes `reports/verify.md` + `reports/verify.json`. `verify.json.ok` is the only closure gate.
   Manual: run the same commands yourself and write `reports/verify.md` with the real output.
2. Tick the ACs you satisfied in `spec.md` (`- [x] AC-01 …`) — only the ones the evidence supports.
3. Review before shipping user-facing work: `sw-review` (fresh context, adversarial).
4. `specweave complete <inc>` — refuses without a passing `verify.json` unless you pass `--reason "<why>"`.

"All tasks are complete, should I close?" is the anti-pattern. Verify, then close.

## Rules

- Claim before edit; edit only the task's `Files:`; append-only ledger.
- One worktree per agent when others share the increment; the branch name carries the increment id: `git worktree add ../0042-codex -b inc/0042-codex`.
- A claim older than 2h with no `done` is stale and may be taken over (`task claim --force`).
- Stopping for any reason: `specweave task release --all-mine`, then `sw-handoff`.
- Sync between agents happens only through committed files — never assume another agent saw anything you did not commit.

## Related

- `sw-task` — the ledger protocol and the manual (no-CLI) forms.
- `sw-increment` — write the spec first. · `sw-review` — adversarial pass before closing.
