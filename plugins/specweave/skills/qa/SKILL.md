---
description: Risk-scored quality assessment of an increment via `specweave qa`. Use when saying "qa", "quality check", "risk assessment", or before deciding whether an increment is ready to close.
version: 2.0.0
argument-hint: "<increment-id> [--gate|--pre|--full]"
---

# QA Assessment

A thin wrapper over `specweave qa` — the deterministic part is the CLI's job.
QA scores risk and lists blockers; it is **not** the code review (`sw:review`)
and **not** the closure gate (`specweave verify` → `reports/verify.json`).

## Commands

| Intent | Command |
|---|---|
| Quick score (default) | `specweave qa <id>` |
| Before implementing | `specweave qa <id> --pre` |
| Comprehensive gate check | `specweave qa <id> --gate` |
| Multi-agent deep pass | `specweave qa <id> --full` |
| In CI (exit 1 on FAIL) | `specweave qa <id> --ci` |
| Rule-based only, no model call | `specweave qa <id> --no-ai` |
| Turn blockers into tasks | `specweave qa <id> --export` |

`--export` appends the blockers to `tasks.md` as new `### T-NN` definitions; claim
them with `specweave task claim` like any other task.

## Steps

1. Run the command for the intent above. Pass the increment id explicitly — QA never guesses.
2. Read the verdict (PASS / CONCERNS / FAIL) and the risk score out loud, then the blockers.
3. **Blockers are work, not commentary**: `--export` them, or fix them now and re-run.
4. If the verdict is FAIL and the user wants to close anyway, that is `specweave complete <id> --reason "<why>"` — recorded in `metadata.json`, not silently skipped.

## Rules

- Report the CLI output verbatim when it fails; do not paraphrase a FAIL into "mostly fine".
- QA does not replace `specweave verify` (tests/lint/build evidence) or `sw:review`
  (adversarial fresh-context reading). Closure needs `verify.json`; QA is advisory.
- `--no-ai` is the offline / no-budget path and is always allowed.

## Resources

- `specweave qa --help`
- [Official Documentation](https://verified-skill.com/docs/reference/skills#qa)
