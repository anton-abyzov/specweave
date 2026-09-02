---
description: Adversarial fresh-context review of an increment before it ships; every finding cites path:line and is re-verified. Use for "review this", "critique the implementation", "review before closing".
argument-hint: "<increment-id> [--full]"
version: "2.0.0"
---

# sw-review — adversarial review with citations

The only review gate that changes code: a **fresh** reader, hunting for real
failures, citing `path:line`, and re-checking every claim before writing it
down. Writes `.specweave/increments/<id>/reports/review.md`.

## Non-negotiables

- **Fresh context.** The session that wrote the code never approves it. Start a new conversation (or a sub-agent, in tools that have them). If you wrote this code in this session, say so and stop — the review is not credible.
- **Every finding cites `path:line`** and a concrete failure: inputs or state → wrong output, crash, hang, corruption or leak. "Consider refactoring" is not a finding.
- **Re-verify before reporting.** Re-open the cited lines and, where a test can show it, run one. Drop anything that does not survive. A wrong finding costs more than a missed one.
- **Severity**: critical / high / medium / low. Only critical and high should block a close.
- **Nits: at most 5**, collected in one line at the end. Style opinions are not review output.

No CLI? Nothing changes: `git diff` and the project's test runner are the whole
toolchain, and you write `reports/review.md` by hand. The manual path and the
CLI path produce the same report.

## Steps

1. **Scope** — read `spec.md` (ACs + Approach) and the `Files:` fields in `tasks.md`. Review that diff, not the repository:

   ```bash
   git diff $(git merge-base HEAD origin/HEAD)...HEAD -- <the tasks' Files>
   ```

   Falling back when there is no merge base: `git diff HEAD~1...HEAD`.
2. **Pass** — in this order: correctness (wrong logic, unhandled errors, races, off-by-one, injection, secret leakage, data loss) → ACs claimed but not implemented → tests that assert nothing (no expectation, mocked subject, snapshot of the bug) → cross-platform breakage (bash-only code, `\` paths, BOM, `>>` in PowerShell).
   `--full`: run three passes — correctness, security, spec-compliance — and merge, dropping duplicates.
3. **Verify** — for each candidate, re-read the lines and state the failure scenario in concrete terms. If you cannot, delete it.
4. **Report** — write `reports/review.md` in the shape below. A machine-readable sibling `reports/review.json` is optional: `{"ok":false,"findings":[{"severity":"critical","file":"src/a.ts","line":142,"summary":"…"}]}`.
5. **Hand back** — critical/high go back to `sw-do` as tasks (or get fixed and re-tested), then `specweave verify <id>` again before `specweave complete <id>`.

`complete` prints a notice when `review.md` is absent but never blocks on it —
the discipline is yours, not the CLI's.

## reports/review.md

```markdown
# Review — 0042 Ledger fold
Verdict: fix first · reviewed 6 files · 3 findings (1 critical, 1 high, 1 medium)

## [critical] src/core/tasks/ledger.ts:142 — lost claim under equal timestamps
Two agents claim T-01 in the same second; the fold sorts only by `at`, so the
order flips between machines and both read themselves as the owner → duplicate
work, one `done` silently ignored.
Fix: break ties by `by` (lexicographic), then by file order.

## [high] src/cli/commands/task.ts:88 — `done` accepts empty evidence
...

Nits (5 max): naming in ledger.ts:31; dead export in task-board.ts:12.
```

Verdict is `fix first` when any critical/high survives, else `ship`.

## Related

- `sw-do` — fix what the review found. · `sw-task` — the ledger the fixes are tracked in.
