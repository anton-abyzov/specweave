---
description: Close increment with PM 3-gate validation (tasks, tests, docs). Use when all tasks complete and saying "close increment", "we're done", or "finish up".
version: 2.0.0
argument-hint: "<increment-id> [--reason <text>]"
---

# Close Increment

Closure = **verify → optional review → `specweave complete`**. The only hard
gate is `reports/verify.json` with `ok: true`. Grill / judge / rubric reports
are optional evidence and never block.

## Usage

```
sw:done <increment-id>                    # normal closure
sw:done <increment-id> --reason "<why>"   # close without a green verify (recorded as metadata.closeReason)
```

## Steps

1. **Ledger check**: `specweave task list <id>`. Every task must be `done` or `skipped`. Open/claimed tasks → go back to `sw:do` (or `task skip … --reason "<why>"`). Release your own claims: `specweave task release --all-mine`.
2. **Verify**: `specweave verify <id>`. Runs `testing.commands` from config (else `npm run test|lint|build`, `cargo test`, `pytest`, `go test ./...`), writes `reports/verify.md` + `reports/verify.json`. Non-zero exit → fix, re-run. Do not proceed on red without a `--reason` from the user.
3. **Review (recommended for anything user-facing, optional otherwise)**: invoke `Skill({ skill: "sw:review" })` — fresh context, adversarial, findings cite `path:line`, written to `reports/review.md`. If `sw:review` is not installed, `sw:code-reviewer` is the fallback. Fix critical/high findings, re-run step 2 if code changed.
4. **Docs touched?** If the increment changed commands, config, or user-facing behaviour, update README/CHANGELOG/CLAUDE.md `## Commands` in the same commit. Living docs sync only if `livingDocs` is enabled in config (`sw:sync-docs`).
5. **Complete**: `Bash({ command: "specweave complete <id> --yes" })`. The CLI refuses when `verify.json` is missing or not ok unless `--reason "<text>"` is given; it prints a notice when `reports/review.md` is absent; it sets `status: completed` and syncs GitHub/Jira/ADO when configured. **Never edit `metadata.json` status by hand.**
6. **Handoff**: if work continues elsewhere (follow-ups, another increment), `sw:handoff`.

Report in one paragraph: verify result, review verdict (or "skipped"), commit sha(s), anything deferred.

## Rules

- Never ask "should I close?" — closure follows automatically when tasks are done; the user can re-open.
- `--skip-validation` exists for emergencies only; prefer `--reason` so the reason is recorded.
- Multi-agent sessions (`sw:team-lead`): only the lead runs `sw:done`, after every agent has released and handed off.
- Failed sync after completion: `specweave sync push <id>` retries; closure itself already succeeded.

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#done)
