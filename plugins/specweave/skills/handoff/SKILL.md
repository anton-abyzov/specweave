---
disable-model-invocation: true
description: Write a portable, secret-scrubbed handoff doc so this work can continue in any AI tool or on any machine. Use when saying "handoff", "running out of tokens", or "continue elsewhere".
version: 2.0.0
argument-hint: "[incrementId] [--reason ...] [--summary ...] [--next ...] [--gotcha ...] [--decision ...] [--inline]"
---

# Work Handoff (Cross-Tool)

No tool can read another's transcript. The portable thing is a ≤1-page
`handoff.md` next to the increment, built from durable state (ledger fold,
spec ACs, decisions, git diff) — any agent from any vendor resumes from it.

## Steps

1. **Release your claims** (rule 5): `specweave task release --all-mine`.
2. **Write the doc**, adding only what the files cannot know:

   ```bash
   specweave handoff [incrementId] [--reason "…"] [--summary "…"] [--next "…"] [--gotcha "…"] [--decision "…"] [--inline]
   ```

   - id optional when exactly one increment is `active`; 2+ active → the CLI lists candidates, re-run with one.
   - `--inline` embeds the full body in the paste prompt (moving machines).
   - No SpecWeave workspace / no active increment → a git + notes handoff still gets written.
3. **Surface the CLI output verbatim**: doc path first, then the `.diff` path, then the fenced paste prompt.

## What is written

- `.specweave/increments/<id>/handoff.md` (+ `handoff.diff` with the full uncommitted diff) — the single location; `.specweave/state/handoff-latest.txt` points at it.
- Sections: **Where I left off · Done / Pending (ledger table) · Decisions · Files touched · Next steps · Resume**, ending with the `Doc format v2` marker. Header line = agent id, branch @ sha, uncommitted count, redaction count, active claims. The doc format is specified once, in the standalone `sw-handoff` skill (`skills/sw-handoff/SKILL.md`) — read it there when writing or checking a handoff by hand.
- Secrets are scrubbed heuristically — review before sharing. Nothing is committed for you; commit `handoff.md` if the next agent works from another clone.

## Resuming from a handoff

Read `handoff.md` → `specweave task next <id>` → claim → go. If the path does not exist on this machine, ask for the doc to be pasted; do not improvise context.

## Related

- `specweave status` — where things stand, without writing a handoff. PreCompact hook writes the same doc automatically.
- `skills/sw-handoff/SKILL.md` — the standalone, CLI-less version (vskill: `npx vskill install anton-abyzov/specweave/sw-handoff`) and the single source of truth for the document format.
