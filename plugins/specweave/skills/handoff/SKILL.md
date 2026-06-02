---
name: sw/handoff
description: Write a portable, secret-scrubbed work handoff doc so you can continue this work in any AI tool. Use when saying "handoff", "running out of tokens", "switch to Codex/OpenCode/Gemini/Cursor", "continue elsewhere", or "continue on another machine".
version: 1.0.0
argument-hint: "[incrementId] [--reason ...] [--summary ...] [--next ...] [--gotcha ...] [--decision ...] [--inline]"
---

# Work Handoff (Cross-Tool)

No AI coding tool can read another's transcript — each locks its session in a proprietary `.jsonl`, SQLite DB, or encrypted `.pb`. The only portable thing is a **self-contained handoff document**. This skill assembles SpecWeave's durable on-disk state (active increment, task/AC progress, decisions, ambient rules) plus a full diff of your uncommitted edits into one document that any other tool can read to pick up exactly where you left off.

This skill is the Claude Code surface of the cross-tool handoff feature. It is intentionally thin: the deterministic engine is the `specweave handoff` CLI subcommand. The same engine backs the PreCompact auto-handoff hook and the vskill `handoff` skill that carries this capability to other tools — so a handoff written here is continuable in Codex/OpenCode/Gemini/Cursor unchanged.

## When to use

- Low on subscription tokens — hand off and continue in another tool's free or separate quota.
- Want a durable artifact in case the session dies at context exhaustion.
- Moving to another machine — use `--inline` so the full doc travels inside the paste-prompt.

## Workflow

1. **Run the CLI**, forwarding any short context the agent can supply cheaply:

   ```bash
   specweave handoff [incrementId] [--reason ...] [--summary ...] [--next ...] [--gotcha ...] [--decision ...] [--inline]
   ```

   - No `incrementId` + exactly one active increment → it is used automatically.
   - No active increment → a git + short-interview handoff is written (still portable).
   - 2+ active increments + no `incrementId` → CLI errors listing candidate ids; re-run with the chosen id.

2. **Surface the CLI output verbatim, in order** (do not reorder or paraphrase):
   1. absolute doc path as plain text (first), 2. clickable markdown link, 3. `.diff` path,
   4. fenced copy-paste resume prompt, 5. per-tool "find your source session" tips.

3. **Respect the safety defaults**: the doc + diff are secret-scrubbed and gitignored by default; scrubbing is heuristic (review before sharing); nothing is committed.

## Doc format (single source of truth)

The doc is rendered by `handoff-doc-format.ts` and has these sections, in this order, ending with the `Doc format v1` footer marker:

1. **Where I Left Off** — reason, summary, active increment id + status, current/next task.
2. **Done / Pending** — task counts + %, AC counts, AC/task drift from `acSyncEvents`.
3. **Key Decisions & Gotchas** — decisions from `plan.md` + agent-supplied, plus ambient rules (test mode, coverage target, WIP limit) from `config.json`.
4. **Files Touched** — `git status --porcelain` + `git diff --stat` inline; the full uncommitted diff is in the sibling `.diff` file; an UNCOMMITTED warning when the tree is dirty.
5. **Exact Next Steps** — the explicit next step or the next pending task.
6. **How To Resume** — per-tool resume matrix (Claude `claude -r <uuid>`, Codex `codex resume <uuid>` / `--last`, OpenCode `opencode -s <id>`, Gemini `/chat resume <tag>`, Antigravity Agent Manager, Aider `aider --restore-chat-history`) + the instruction to STOP and ask for a paste if the doc path is missing on the current machine.
7. **Redaction** — per-pattern secret-scrub counts + the heuristic disclaimer.

## Doc placement

- **SpecWeave**: `.specweave/increments/{id}/reports/handoff.md` + a stable copy at `.specweave/state/handoff-latest.md` (with `handoff-latest.diff`).
- **Non-SpecWeave**: `.handoff/HANDOFF.md` + `.handoff/handoff.diff`, with a self-created `.handoff/.gitignore` containing `*`.

## Related

- `sw:progress` — status without writing a handoff.
- vskill `handoff` skill — the self-contained cross-tool version for Codex/OpenCode/Gemini/Cursor (no SpecWeave required).
- `docs/guides/cross-tool-handoff.md` — the cross-tool matrix and full reference.
