---
description: Write a portable, secret-scrubbed handoff doc plus a diff of your uncommitted edits so another tool or machine resumes where you stopped. Use for "handoff", "out of tokens", "switch to Codex".
argument-hint: "[increment-id] [--reason ...] [--summary ...] [--next ...] [--inline]"
version: "2.0.0"
---

# sw-handoff — resume anywhere

No AI tool can read another's transcript. The portable thing is a ≤1-page
document built from durable state: the ledger, the spec ACs, the decisions, and
the exact uncommitted diff. This skill writes that document.

Run `specweave --version`: exit 0 → **CLI path**. Not found → **manual path**.
Both emit the same sections and the same `Doc format v2` footer marker, so a doc
from either path is resumable by either.

## Before you write

Release your claims so nothing is stuck behind a dead session:
`specweave task release --all-mine` (manual: append one `release` line per task
you hold — see `sw-task`).

## CLI path

```bash
specweave handoff [<inc>] [--reason "out of tokens"] [--summary "..."] \
  [--next "..."] [--gotcha "..."] [--decision "..."] [--inline]
```

Writes `.specweave/increments/<inc>/handoff.md` + `handoff.diff`, points
`.specweave/state/handoff-latest.txt` at it, and prints the doc path, the diff
path and a copy-paste resume prompt. **Surface that output verbatim, in order.**
`--inline` embeds the whole body in the prompt (use when moving machines).
No workspace or no active increment → a git + notes handoff is still written.

## Manual path

1. Capture git state (free):

```bash
git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD
git status --porcelain; git diff --stat
{ git diff HEAD; git diff --cached; } > handoff.diff
```

2. Ask the user only what the files cannot know: why you are stopping, where
   things stand in one line, the exact next step, any gotcha, key decisions.
3. **Scrub secrets** in the free text AND the diff before writing: replace
   `sk-…`, `gh[pos]_…`, `AKIA…`/`ASIA…`, `vsk_…`, `xox[bap]-…`, `Bearer …`,
   `password=…`, `api_key=…`, `-----BEGIN …` with `[REDACTED-<type>]` and count
   them. Heuristic — say so; an empty list is not a guarantee.
4. Write the document below to `.specweave/increments/<inc>/handoff.md`
   (no increment → `.handoff/HANDOFF.md`, with `.handoff/.gitignore` = `*`).
   UTF-8 without BOM; on PowerShell write with
   `[IO.File]::WriteAllText($p, $body, [Text.UTF8Encoding]::new($false))`, never `>`.
   If a file is already there without the `Doc format v2` (or `v1`) marker it is
   somebody else's — do not overwrite it.
5. Print the absolute doc path first, then the diff path, then the paste prompt.

## Document (sections in this exact order)

````markdown
# Handoff — 0042 Ledger fold
agent: codex@mbp · 2026-09-02T10:00:00Z · branch inc/0042-codex @ a1b2c3d · tree: 4 uncommitted · redactions: 0
active claims: T-03 (claimed by codex@mbp)

## Where I left off
Why: out of tokens
Increment 0042-ledger-fold (active) · tasks 2/5 done · ACs 1/3
Gotcha: the fold test writes into a temp dir — do not run it in parallel.

## Done / Pending
| Task | State | By | Evidence / note |
|---|---|---|---|
| T-01 Fold the ledger | done | codex@mbp | npm test -- ledger → exit 0 / a1b2c3d |
| T-03 Board render | claimed | codex@mbp |  |
2/5 done · 0 skipped · 1 claimed · 0 blocked · 0 stale · 2 open

## Decisions
- Ties in the fold break by `by`, then file order (spec.md Approach).

## Files touched
UNCOMMITTED — commit or stash before anything destructive.
```
<git status --porcelain>
```
Full diff: `/abs/path/handoff.diff`

## Next steps
`specweave task claim T-04 0042-ledger-fold` — render the board block.

## Resume
1. Read this file; if the path does not exist on your machine, ask for it to be pasted.
2. `specweave task next 0042-ledger-fold` → claim → implement → `task done --run`.
3. Original transcript (optional): Claude Code `claude -r <uuid>` · Codex `codex resume <uuid>` · OpenCode `opencode -s <id>`.

---
<!-- Doc format v2 -->
````

Empty sections still appear, with the reason: `_None recorded — see spec.md
Approach._`, `Working tree clean.`, `_No task state available._`. The footer
marker is mandatory and must be the last line.

## Paste prompt

```
Resume my work. Read the handoff doc at: <ABSOLUTE_DOC_PATH>
If that path does NOT exist on this machine, STOP and ask me to paste the handoff — do not improvise context.
The exact uncommitted edits are in: <ABSOLUTE_DIFF_PATH>
```

Cross-machine (`--inline`): same prompt, plus the full document body between
`BEGIN HANDOFF` and `END HANDOFF` lines.

## Rules

- The doc and diff are never auto-committed; commit `handoff.md` yourself only when the next agent works from another clone.
- Resuming: read the doc, then `sw-task` → `task next` → claim. Do not improvise context you did not read.

## Related

- `sw-task` — release claims before handing off. · `sw-do` — the loop you are resuming into.
