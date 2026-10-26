---
description: Adversarial review of an increment before it ships, by a fresh context or another model family; every finding cites path:line and is re-verified. Use for "review", "qa", "critique this".
argument-hint: "[increment-id] [--full]"
version: 3.1.0
---
<!-- Generated from skills/sw-review/SKILL.md by scripts/build/generate-skills.mjs. Edit the source, then npm run build. -->

# sw-review: adversarial review with citations

A fresh reader hunts for real failures in the increment's diff, cites `path:line` for
each, re-checks every claim, and writes `.specweave/increments/<id>/reports/review.md`.
This is also the quality check: its verdict says whether the increment is ready.

## Non-negotiables

- **Fresh context.** The session that wrote the code never approves it. Use a new
  session, a subagent if your tool supports them, or another model (below). If you
  wrote this code here and cannot get a fresh context, say so in the report.
- **Every finding cites `path:line`** and a concrete failure: input or state leads to
  wrong output, a crash, a hang, data loss or a leak. "Consider refactoring" is not one.
- **Re-verify.** Re-open the lines and, where a test can show it, run one. Drop what
  does not survive; mark what you could not prove as `plausible`.
- **Severity** is critical, high, medium or low. Critical and high block the close.
- **At most 5 nits**, in one line at the end.

## Steps

1. **Evidence first.** `specweave verify` (or its existing `reports/verify.md`): red
   tests, lint or build are findings before any reading.
2. **Scope.** Read spec.md (ACs, Approach, the tasks' `Files`) and review that diff,
   not the repository: `git diff $(git merge-base HEAD origin/HEAD)...HEAD -- <Files>`.
3. **Pass**, in this order: correctness (logic, error paths, races, off-by-one) →
   security (injection, path traversal, secrets, unsafe exec) → spec compliance (ACs
   claimed but not implemented, tests that assert nothing, mock the subject or only
   restate the implementation) →
   portability (bash-only commands, `\` paths, BOMs, `>>` in PowerShell).
   `--full`: run the three lenses correctness, security and spec compliance separately
   (in parallel if your tool has subagents). Each lens returns only a JSON list of
   `{"severity","file","line","summary","verified"}`; merge by deduping on (file,line),
   then re-open every line yourself before it goes in the report.
4. **Report** in the shape below; `specweave complete` reads its verdict line. Optional
   machine form, `reports/review.json`, nothing gates on it:
   `{"ok":false,"findings":[{"severity":"high","file":"src/a.ts","line":88,"summary":"...","verified":true}]}`.
5. **Hand back.** Each critical or high finding becomes a task in spec.md
   (`### T-09 Fix empty evidence` + `- AC: AC-02 | Files: ... | Test: ...`) for sw-do, or
   is fixed and re-tested now. Then verify again and close with sw-done.

## Another model

A model reviewing code its own family wrote shares that code's blind spots.
`specweave review` hands the increment to a reviewer from another family: it reads who
finished the tasks from the ledger (`claude@mbp` is Claude), runs Codex with GPT-6.1-Sol
on Claude-written code (Claude Opus on OpenAI-written code), and writes
`reports/review-codex.md` in the shape below plus a ledger note. Exit 0: ship; 3: fix
first, or no verdict; 1: no reviewer installed, or it failed.

- Run it when `review.crossModel` is true in `.specweave/config.json`, when the user
  asks for another model, or when you wrote the code and have no fresh context.
- `--brief` prints the brief (ACs, tasks and their Files, the diff) to paste into any
  model by hand; `--reviewer claude`, `--base origin/main` and `--timeout 45` override.
- `review.reviewer` pins one reviewer; `review.reviewers.<name>.command` adds a CLI that
  reads the brief on stdin and answers on stdout, or into `{out}` when it names one.

Its findings get the same treatment as yours: re-open each line before acting on it.

## reports/review.md

```markdown
# Review: 0042 Ledger fold
Verdict: fix first · risk: high · 6 files · 2 findings (1 critical, 1 high)
Reviewer context: new session

## [critical] src/core/tasks/ledger.ts:142 lost claim under equal timestamps
Two agents claim T-01 in the same second; the fold sorts only by `at`, so both read
themselves as owner. Fix: break ties by `by`, then file order.

Nits: naming in ledger.ts:31.
```

Verdict is `fix first` while any critical or high finding survives, else `ship`.
`specweave complete` notes a `fix first` verdict in the newest review report.

## Manual path (no CLI)

Nothing changes: `git diff` and the project's own test runner are the whole toolchain,
and you write `reports/review.md` yourself.
