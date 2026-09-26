---
id: quality-gate
title: Quality gate
sidebar_label: Quality gate
description: What SpecWeave 3.0 checks before an increment can close - a passing verify report, or an explicit reason - and the optional reviews around it.
---

# Quality gate

A **quality gate** is a check that has to pass before work moves on. SpecWeave 3.0 has one blocking gate, at close, and keeps everything else as evidence you can choose to collect.

## The closure gate

`specweave complete` closes an increment only when `reports/verify.json` exists and says the run passed. That report comes from `specweave verify`:

```bash
specweave verify 0042     # runs test, lint and build; checks every AC
specweave complete 0042
```

`verify` passes when:

- every command it runs exits 0. The commands come from `testing.commands` in `.specweave/config.json`, or are detected from your stack (the Commands table in `AGENTS.md` lists them);
- every acceptance criterion is met, meaning the tasks that cover it are done in the [ledger](/docs/glossary/terms/ledger). See [AC-ID](/docs/glossary/terms/ac-id).

It writes `reports/verify.md` for people and `reports/verify.json` for the gate.

If verify fails, `complete` says why: which command failed, or how many criteria are not met. To close anyway, for example when the work was dropped or moved to another increment, give a reason. It is stored as `closeReason` in [metadata.json](/docs/glossary/terms/metadata-json):

```bash
specweave complete 0042 --reason "moved to 0045"
```

## Per-task evidence

A task is not done until its test ran and passed. `specweave task done T-02 --run "npm test -- restore"` runs the command, refuses to mark the task done on a non-zero exit, and stores the output tail and the commit sha as evidence. The full output goes to `reports/task-T-02.log`.

## Optional checks

These add evidence but never block closing on their own:

| Check | How to run it |
|---|---|
| Code review in a fresh session | `/sw:review` in Claude Code, or ask any tool to "review this increment". Writes `reports/review.md`; `complete` notes when it is missing. |
| Quality assessment | `specweave qa 0042` (`--pre` before coding, `--gate` for a fuller pass, `--ci` to exit 1 on FAIL). |
| Rubric | `specweave generate-rubric 0042` writes a `rubric.md` tied to the ACs. |

`AGENTS.md` asks for a review in a fresh session for anything that ships, because the session that wrote the code is the worst judge of it.

## Related

- [Increment](/docs/glossary/terms/increments)
- [Troubleshooting: verify and complete](/docs/guides/troubleshooting#verify-and-complete)
- [Commands reference](/docs/reference/commands)
