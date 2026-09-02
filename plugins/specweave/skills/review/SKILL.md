---
description: Adversarial fresh-context review of an increment before it ships. Every finding cites path:line and is re-verified. Use when saying "review", "grill this", or "critique the implementation".
version: 2.0.0
argument-hint: "<increment-id> [--full]"
---

# Review Increment

One review surface (it replaces the old grill / code-reviewer / judge-llm passes).
Reads the increment's spec, its diff and the code around it, then reports what is
actually wrong — with `path:line` for every claim. Writes
`reports/review.md` + `reports/review.json` under the increment.
`specweave complete` prints a notice when review.md is absent but never blocks.

## Usage

```
sw:review <increment-id>            # single adversarial pass
sw:review <increment-id> --full     # 3 parallel lenses: correctness, security, spec-compliance
```

## Rules

1. **Fresh context. The session that wrote the code never approves it.** Run the pass
   through a subagent (Claude Code: `Task({ subagent_type: "general-purpose", … })`) or a
   new session in any other tool. If you wrote this code in this context and cannot spawn
   one, say so in the report instead of claiming an independent review.
2. **Every finding cites `path:line`** and states a concrete failure: inputs or state →
   wrong output, crash, data loss, or leak. No "consider refactoring", no style opinions.
3. **Re-verify before reporting.** Re-open the cited lines — and run the test that would
   fail — and drop anything that does not survive. A wrong finding costs more than a
   missed one. Unverifiable but plausible findings are reported as `plausible`, not as fact.
4. **Severity**: critical / high / medium / low. Only critical and high are blocking.
5. **Nit cap 5.** At most five low findings; if there are more, report the five worst and
   one line saying how many were dropped.
6. **Scope is the increment's diff**, not the repository:
   `git diff $(git merge-base HEAD <base>)...HEAD -- <the tasks' Files>`.

## Steps

1. **Scope**: read `spec.md` (ACs + Approach) and the `Files:` fields in `tasks.md`.
   Collect the diff for those files plus the code they call.
2. **Pass** — in this order:
   - correctness: wrong logic, unhandled error paths, races, off-by-one, resource leaks;
   - security: injection, path traversal, secret leakage, missing authz, unsafe spawn/exec;
   - spec-compliance: ACs marked done but not implemented, tests that assert nothing,
     behaviour that contradicts spec.md.
   With `--full`, run those three as parallel subagents and merge their findings
   (dedupe by `file:line + summary`).
3. **Verify** each candidate finding as per rule 3.
4. **Report**: write both files (shapes below).
5. **Hand back**: fix critical/high findings yourself or hand them to `sw:do`, then re-run
   `specweave verify <id>` and close with `sw:done`.

## Report shape

`reports/review.md`:

```markdown
# Review — <id> <title>
Verdict: fix first | ship · reviewed <n> files · <n> findings (<n> critical, <n> high)
Reviewer context: subagent | new session | same session (NOT independent)

## [critical] src/core/tasks/ledger.ts:142 — stale claim never released
Given two agents claim T-01 inside the lease window … → the second write wins and the
first agent's `done` line is dropped.
Fix: compare-and-append on the claim line before writing.
```

`reports/review.json` (machine-readable, same findings):

```json
{
  "ok": false,
  "increment": "0042",
  "reviewedAt": "2026-09-02T12:00:00Z",
  "mode": "single",
  "findings": [
    {
      "severity": "critical",
      "file": "src/core/tasks/ledger.ts",
      "line": 142,
      "summary": "stale claim never released; second writer drops the first done line",
      "confidence": "confirmed"
    }
  ],
  "droppedNits": 0
}
```

`ok` is `true` only when there is no critical or high finding.

## Anti-patterns

- Approving your own work in the same context — that is the one thing this skill exists to prevent.
- Findings without a line number, or with a line number you did not re-read.
- Padding the count with style nits (see the nit cap).
- Reviewing the whole repo instead of the increment's diff.

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#review)
