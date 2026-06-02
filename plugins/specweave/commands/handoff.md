---
description: Write a portable, secret-scrubbed work handoff doc so you can continue this work in any AI tool. Use when saying "handoff", "running out of tokens", "switch to Codex/OpenCode/Gemini/Cursor", "continue elsewhere", or "continue on another machine".
argument-hint: "[incrementId] [--reason ...] [--summary ...] [--next ...] [--gotcha ...] [--decision ...] [--inline]"
---

# Work Handoff (Cross-Tool)

Assemble the current work state into one portable, self-contained handoff document so the work can be picked up in another AI coding tool — Claude Code, Codex, OpenCode, Gemini, Antigravity, Cursor, Aider — picking up exactly where you left off, uncommitted edits and all.

The expensive, deterministic work (workspace detection, task/AC parsing, git capture, full-diff dump, secret scrub, rendering) is done by the `specweave handoff` CLI subcommand. This command is a thin wrapper that runs it and surfaces the output.

## When to use

- You are low on subscription tokens and want to continue in another tool.
- You want a durable artifact that survives a context crash.
- You are moving to another machine (`--inline` embeds the full doc in the paste-prompt).

## Workflow

### Step 1: Run the CLI

Pass through whatever short context the agent can supply cheaply. All flags are optional — the CLI derives everything it can from disk.

```bash
specweave handoff $ARGUMENTS
```

`$ARGUMENTS` forwards `[incrementId]` plus any `--reason`, `--summary`, `--next`, `--gotcha`, `--decision`, and `--inline` flags the user (or agent) provided.

- No `incrementId` and exactly one active increment → it is used automatically.
- No active increment → a git + interview handoff is written (still portable).
- 2+ active increments and no `incrementId` → the CLI errors listing the candidate ids; re-run with the chosen id.

### Step 2: Surface the output VERBATIM, in order

The CLI prints, in this exact order — present it to the user without reordering:

1. **The absolute doc path as plain text** (so it is copyable/clickable in any terminal).
2. A clickable markdown link to the doc.
3. The `.diff` path holding the exact uncommitted edits.
4. A fenced copy-paste **resume prompt** to drop into the next tool.
5. Per-tool "find your source session" tips (Claude `claude -r <uuid>`, Codex `codex resume <uuid>`, OpenCode `opencode -s <id>`, etc.).

Do NOT re-summarize or reformat the resume prompt — the user copies it as-is.

### Step 3: Note the safety defaults

The doc and diff are **secret-scrubbed and gitignored by default** (`.handoff/` or `.specweave/state/handoff-latest.*`). Scrubbing is heuristic — remind the user to review before sharing. Nothing is committed and no `git add` hint is printed.

## Related

- `sw:progress` — check increment status without writing a handoff.
- `sw:next` — close the current increment and suggest next work.
- The portable doc format and cross-tool resume matrix: see the `handoff` skill and `docs/guides/cross-tool-handoff.md`.
