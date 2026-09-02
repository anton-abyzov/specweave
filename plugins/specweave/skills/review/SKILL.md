---
description: Adversarial fresh-context review of an increment before it ships. Findings cite path:line and are re-verified before reporting. Use when saying "review", "grill this", "critique the implementation", "review before closing", or when sw:done asks for review evidence.
version: 2.0.0
argument-hint: "<increment-id> [--full]"
---

# Review Increment

One review surface. Reads the increment's spec, its diff and the code around it,
then reports what is actually wrong — with `path:line` for every claim. Writes
`.specweave/increments/<id>/reports/review.md`. Recommended for anything that
ships; `specweave complete` prints a notice when the file is absent but never
blocks on it.

## Usage

```
sw:review <increment-id>            # single adversarial pass
sw:review <increment-id> --full     # parallel fan-out (security / logic / performance)
```

## Rules

- **Fresh context.** The session that wrote the code never approves it. In Claude Code, run the pass through a subagent (`Agent`) or a new session; in other tools, start a new conversation.
- **Every finding cites `path:line`** and names the failure: inputs or state → wrong output, crash, or leak. No "consider refactoring".
- **Re-verify before reporting.** Re-read the cited lines (and run the test that would fail) and drop anything that does not survive. A wrong finding costs more than a missed one.
- **Severity**: critical / high / medium / low. Only critical and high block closure.
- Review the increment's diff, not the whole repository: `git diff $(git merge-base HEAD main)...HEAD -- <the tasks' Files>`.

## Steps

1. **Scope**: read `spec.md` (ACs + Approach) and `tasks.md` `Files:` fields. Get the diff for those files.
2. **Pass**: hunt for correctness bugs first (wrong logic, unhandled error paths, race conditions, injection, secret leakage, data loss), then for ACs claimed but not implemented, then for tests that assert nothing.
   With `--full`, fan out three parallel passes — security, logic, performance — and merge their findings.
3. **Verify**: for each candidate finding, re-open the cited lines and confirm the failure scenario is real. Drop the rest.
4. **Report**: write `reports/review.md` — verdict (`ship` / `fix first`), then one section per surviving finding: severity, `path:line`, the failure scenario, the suggested fix.
5. **Hand back**: fix critical/high findings (or hand them to `sw:do`), re-run `specweave verify <id>`, then close with `sw:done`.

## Report shape

```markdown
# Review — <id> <title>
Verdict: fix first | ship · reviewed <n> files · <n> findings (<n> critical, <n> high)

## [critical] src/core/tasks/ledger.ts:142 — stale claim never released
Given two agents claim T-01 within the lease window … → the second write wins and the first agent's `done` is dropped.
Fix: compare-and-append on the claim line before writing.
```

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#review)
