# Cross-Tool Work Handoff

> **Run out of tokens? Hand off your work to any AI tool — pick up exactly where you left off, uncommitted edits and all.**

:::tip Works in 8+ tools
One command writes a portable handoff document that **Claude Code, Codex, OpenCode, Gemini, Antigravity, Cursor, Aider, Cline/Roo, and Windsurf** can all read. The document — not any tool's private transcript — is the portable context.
:::

## The problem

No AI coding tool can read another's session. Each one locks its transcript in a proprietary store — a `.jsonl` file, a SQLite database, or an encrypted `.pb`. So when you burn through your subscription tokens on one tool mid-task, the in-flight context (your goal, the decisions you made, your *uncommitted* edits) is trapped there. Switching to another tool — a different subscription, or a free tier — means re-explaining everything from scratch, and your uncommitted edits are invisible to the new tool.

There is no shared, readable session format. The only thing portable across tools is a **document** the next agent can read.

## The solution

`/sw:handoff` (in Claude Code) — or the installed `handoff` skill in any other tool — assembles your current work state into one durable, secret-scrubbed handoff document, dumps a full diff of your uncommitted edits to a sibling file, and prints:

1. the **absolute path** of the doc (plain text, so it is copyable everywhere),
2. a clickable link,
3. the `.diff` path with your exact uncommitted edits,
4. a copy-paste **resume prompt** to drop into the next tool,
5. per-tool tips for finding your original session.

```bash
specweave handoff                       # one active increment → used automatically
specweave handoff 0867                   # pick a specific increment
specweave handoff --reason "out of tokens" --next "wire the CLI command"
specweave handoff --inline               # embed the full doc for a different machine
```

It works on **any** project, SpecWeave or not. A `PreCompact` hook auto-writes a handoff so one survives even a token crash before you ever run the command.

## What makes it different

These four moats are why a handoff document beats "just summarize where we are":

- **Captures uncommitted edits — not just filenames.** The full `git diff` (working tree + staged) is dumped to a sibling `.diff` file for free, no tokens spent. The next agent reads the exact edits or runs `git apply --check` against them.
- **Survives a token crash.** A `PreCompact` (and gated `Stop`) hook auto-writes a handoff with whatever short context was last stated, so a resumable artifact exists even if your session dies at context exhaustion.
- **Secret-scrubbed and gitignored by default.** A regex scrub runs over both the free-text fields and the captured diff before any write; the doc and diff are gitignored (`.handoff/.gitignore` = `*`) and never auto-committed.
- **Cross-machine `--inline` mode.** When the file is unreachable on the machine you are resuming on, `--inline` embeds the full scrubbed doc body inside the paste-prompt so the context travels in the prompt itself.

## Cross-tool resume matrix

Every tool stores its session differently. The handoff document is portable across all of them; this table is for *optionally* recovering a tool's own native transcript.

| Tool | Session storage | Find current session | Native resume command | Export / transferable |
|---|---|---|---|---|
| **Claude Code** | `~/.claude/projects/<munged-cwd>/<uuid>.jsonl` | `ls ~/.claude/projects/<munged-cwd>/` (see munge rule below) | `claude -r <uuid>` | Not readable by other tools — use the handoff doc |
| **Codex** | `~/.codex/sessions/<uuid>/` | `ls ~/.codex/sessions/` (newest dir) | `codex resume <uuid>` (or `codex resume --last`) | Not readable by other tools — use the handoff doc |
| **OpenCode** | SQLite-backed session store | `opencode sessions list` | `opencode -s <id>` (long form `opencode --session <id>`) | Not readable by other tools — use the handoff doc |
| **Gemini CLI** | Tagged saved chats | run `/chat list` inside the session | `/chat resume <tag>` | Not readable by other tools — use the handoff doc |
| **Antigravity** | Encrypted `.pb` | open the Agent Manager, pick the prior task thread | resume the thread from the Antigravity Agent Manager | Encrypted — use the handoff doc |
| **Cursor** | App-internal chat history | open the chat panel history | reopen the prior chat in-app | Not exportable — use the handoff doc |
| **Aider** | `.aider.chat.history.md` in repo root | the file is in the repo root | `aider --restore-chat-history` | Markdown file, but Aider-specific — use the handoff doc |
| **Cline / Roo** | VS Code extension storage | open the task list in the side panel | reopen the prior task in-panel | Not portable — use the handoff doc |
| **Windsurf** | App-internal Cascade history | open the Cascade history | reopen the prior conversation in-app | Not portable — use the handoff doc |
| **SpecWeave** | `.specweave/state/handoff-latest.md` + `.specweave/increments/{id}/reports/handoff.md` | the handoff doc itself | `specweave handoff` (re-run to refresh) | **Portable by design** — this is the cross-tool document |

### The Claude Code munge rule

Claude Code session files live under `~/.claude/projects/<munged-cwd>/`, where the working directory is munged by replacing **every** non-alphanumeric character with `-`, and runs are **not** collapsed — so a leading slash and adjacent separators each become their own dash. For example:

```
/Users/antonabyzov/Projects/github/specweave-umb/.claude-worktrees/x
→ -Users-antonabyzov-Projects-github-specweave-umb--claude-worktrees-x
```

The `/.` between `umb` and `claude-worktrees` yields the double dash.

## The handoff document format

The doc is rendered from a single source of truth (`handoff-doc-format.ts`), so every path — the CLI, the auto-trigger hook, and the cross-tool vskill skill — produces the identical format. Sections, in order:

1. **Where I Left Off** — why you are handing off, a summary, the active increment id + status, current and next task.
2. **Done / Pending** — task counts and percentage, AC counts, and any AC/task drift.
3. **Key Decisions & Gotchas** — decisions from `plan.md` plus what you supplied, and ambient rules (test mode, coverage target, WIP limit) from `config.json`.
4. **Files Touched** — `git status --porcelain` and `git diff --stat` inline, an UNCOMMITTED warning when the tree is dirty, and a pointer to the full `.diff`.
5. **Exact Next Steps** — your explicit next step, or the next pending task.
6. **How To Resume** — the per-tool matrix above, plus the rule: if the doc path does not exist on the current machine, STOP and ask for a paste rather than improvise.
7. **Redaction** — per-pattern secret-scrub counts and the heuristic disclaimer.

Every doc ends with a `Doc format v1` footer marker, which doubles as the ownership sentinel: the builder will only overwrite a `HANDOFF.md` that carries this marker, never a project's own foreign `HANDOFF.md`.

## Using it in another tool

Install the self-contained `handoff` skill via vskill so the capability reaches whichever tool you switch to:

```bash
npx vskill i handoff
```

The skill is fully self-contained — it needs only `git` and a shell. If `specweave` happens to be on your PATH it uses it as a high-fidelity accelerator; otherwise it builds a byte-compatible document from your git state plus a short interview. Either way, a handoff written in Claude Code is continuable in Codex (or any of the tools above) unchanged.

---

## See also

- ADR 0867-01 — *Portable handoff document as the cross-tool context boundary* (`.specweave/docs/internal/architecture/adr/0867-01-portable-handoff-document-as-cross-tool-context-boundary.md`) — the architectural rationale.
- [Autonomous Execution](./autonomous-execution.md) — how the auto-trigger hooks fit the broader unattended workflow.

<!-- SEO long-tail keywords (one phrase per line for exact-match indexing):
switch from Claude Code to Codex mid-task
out of tokens Claude continue elsewhere
opencode export session
continue AI session on another machine
portable AI context handoff
hand off work between AI coding tools
resume Claude Code session in another tool
transfer context between AI agents
continue coding after running out of tokens
cross-tool AI handoff
move work from Claude to Codex
AI coding session migration
-->
