# Cross-Tool Handoff and Pickup

> **Out of tokens, or want a second opinion from another model? Hand off in one command, pick up in the next tool in one read.**

:::tip Works across tools and accounts
Claude Code (including Projects threads), Codex, Grok Build, Cursor, GitHub Copilot, Gemini CLI, OpenCode and a second Claude subscription all read the same files: `AGENTS.md`, the increment's `spec.md`, its ledger and the handoff. None of them can read another tool's private transcript, so SpecWeave keeps what matters in git.
:::

## The problem

No AI coding tool can read another's session. Each one keeps its transcript in its own store. When you hit a usage limit mid-task, the goal, the decisions and your uncommitted edits are stuck there. Claude Code project memory stays with one account, so even a second Claude subscription starts cold.

## Hand off

```bash
specweave handoff                         # the active increment
specweave handoff 0042 --reason "out of tokens" --next "restore on return"
specweave handoff --push                  # also commit work in progress to a wip/ branch
```

`handoff`:

- **Releases your task claims**, so the next tool is not locked out.
- **Records decisions and open questions** in the increment's ledger, where every tool reads them.
- **Writes `handoff.md`** with repo-relative paths, so it resolves on any machine.
- **Captures your uncommitted edits** as a diff, leaving out SpecWeave's own bookkeeping so the diff shows your code.
- **Scrubs secrets** from the free-text fields and the diff before writing anything.
- With `--push`, **commits the work in progress to a `wip/` branch** and pushes it. A cloud session, such as a Claude Code Projects thread or a Codex cloud task, only sees what is pushed.

## Pick up

In the next tool, from the project folder:

```bash
specweave pickup
```

`pickup` prints everything a fresh session needs in one read: the active increment, the next task with the text of its acceptance criteria, the branch and whether it is ahead of or behind its upstream, the last handoff, unread notes from other increments, and the project memory index. The Claude Code SessionStart hook prints the same thing, and `AGENTS.md` tells every other tool to run it first.

In 2.x, resuming meant finding and reading four or five files. Now it is one command.

## Who holds a task

A task claim records the tool and host that made it, for example `codex@my-laptop`. SpecWeave detects Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot and Grok; set `SPECWEAVE_TOOL` to name anything else. A claim left by you (the same git email) from another tool can be taken over without `--force`, which is what happens when you switch subscriptions on one machine.

## Using it without the CLI

Install the self-contained `handoff` skill so the capability reaches whichever tool you switch to:

```bash
npx vskill i handoff
```

It needs only `git` and a shell. If `specweave` is on your PATH it uses it; otherwise it writes a compatible handoff from your git state and a short interview.

## Cross-tool resume matrix

Every tool stores its session differently. The handoff document is portable across all of them; this table is for optionally recovering a tool's own native transcript.

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
| **SpecWeave** | `.specweave/increments/{id}/handoff.md` + `ledger.jsonl`, in git | `specweave pickup` | `specweave pickup` | **Portable by design**: any tool, any account |

### The Claude Code munge rule

Claude Code session files live under `~/.claude/projects/<munged-cwd>/`, where the working directory is munged by replacing **every** non-alphanumeric character with `-`, and runs are **not** collapsed — so a leading slash and adjacent separators each become their own dash. For example:

```
/Users/antonabyzov/Projects/github/specweave-umb/.claude-worktrees/x
→ -Users-antonabyzov-Projects-github-specweave-umb--claude-worktrees-x
```

The `/.` between `umb` and `claude-worktrees` yields the double dash.

---

## See also

- [SpecWeave 3.0](./specweave-3.md): everything that changed in this release.
- [Claude Code Projects and threads](./claude-code-projects.md): one thread, one increment, and the memory folder.
- [Autonomous Execution](./autonomous-execution.md): how handoff fits unattended work.

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
