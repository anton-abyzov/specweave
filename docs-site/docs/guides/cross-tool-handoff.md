# Cross-Tool Handoff and Pickup

> **Out of tokens, or want a second opinion from another model? Hand off in one command, pick up in the next tool in one read.**

:::tip Works across tools and accounts
Claude Code (including Projects threads), Codex, Grok Build, Cursor, GitHub Copilot, Gemini CLI, OpenCode and a second Claude subscription all read the same files: `AGENTS.md`, the increment's `spec.md`, its ledger and the handoff. None of them can read another tool's private transcript, so SpecWeave keeps what matters in git.
:::

## The problem

No AI coding tool can read another's session. Each one keeps its transcript in its own store. When you hit a usage limit mid-task, the goal, the decisions and your uncommitted edits are stuck there. Claude Code project memory stays with one account, so even a second Claude subscription starts cold.

## Hand off

Tell your agent "hand off", or run:

```bash
specweave handoff                     # the active increment
specweave handoff 0042 --reason "out of tokens" --next "restore on return"
```

`handoff`:

- **Releases your task claims**, so the next tool is not locked out.
- **Writes `handoff.md`** with where you stopped, the next step and repo-relative paths, so it resolves on any machine.
- **Pushes your work to git** when the repo has an `origin` remote: your branch, and a snapshot of your uncommitted edits to a well-known handoff ref and to `wip/<branch>`. Your working tree, index and branch are left as they were.
- **Scrubs secrets** from the free-text fields and the diff before writing anything.
- **Writes an HTML report** of who did what on the increment to `reports/handoff-report.html`. `specweave report` writes it on demand.

`--no-push` keeps the handoff local and `--keep-claims` keeps your claims.

Because the handoff lives in git, a cloud session such as a Claude Code Projects thread or a Codex cloud task sees it the same way your laptop does. There is nothing to copy or paste.

## Pick up

In the next tool, from the project folder:

```bash
specweave pickup
```

`pickup` fetches the last handoff. When your checkout is clean and the history allows it, it fast-forwards your branch and applies the handed-off edits; otherwise it says in plain words what to do and changes nothing. `--no-apply` only shows what is waiting. Then it prints everything a fresh session needs in one read: the active increment, the next task with the text of its acceptance criteria, its files and test, the branch, notes from other increments, and the project memory index.

The Claude Code SessionStart hook prints the same summary, and `AGENTS.md` tells every other tool to run `pickup` first. In 2.x, resuming meant finding and reading four or five files and pasting a prompt. Now it is one command.

To leave a message for whoever works on an increment next:

```bash
specweave note "Draft restore works; expiry not started" 0042
```

## Hand off automatically

On your own machine, SpecWeave can hand off for you before a session runs out:

```bash
specweave auto-handoff on            # hand off at 90% of any usage window
specweave auto-handoff on --at 80    # or pick your own threshold
specweave auto-handoff status
specweave auto-handoff off           # restores your previous setup
```

In Claude Code, `on` sets the status line to `specweave statusline`, which records the 5-hour and 7-day usage Claude Code reports on Pro and Max plans after the first reply. If you already have a status line, it keeps showing it. It also adds a `specweave usage-guard` Stop hook. When `~/.codex` exists, the same hook goes into `~/.codex/hooks.json`, and there it reads the rate limits Codex writes to its session log. Once usage passes the threshold, the hook stops the agent once per session and has it run `specweave handoff`, then tell you to say "pick up" in the next tool. Under the threshold the hook adds nothing to the conversation.

Cloud sessions (Claude Code on the web, Projects threads and Codex cloud tasks) have no status line or user hooks, so there you still say "hand off".

## Who holds a task

A task claim records the tool and host that made it, for example `codex@my-laptop`. SpecWeave detects Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot and Grok; set `SPECWEAVE_TOOL` to name anything else. `specweave handoff` releases your claims, so the next tool can claim the same tasks straight away. A claim that was never released expires after the lease (2 hours by default); before that, `specweave task claim <id> --force` takes it over.

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

## Evidence: a recorded handoff

This is a real run of the 3.0 CLI across two clones of one repository, with nothing copied between them except through git. The first clone ran as a Claude Code cloud session: it finished T-01, started T-02, left a note and handed off.

```text
$ specweave task done T-01 --run "npm test"
Done T-01 (1/2) — evidence: npm test → exit 0
$ specweave handoff --reason "out of tokens" --next "finish restore on return"
Handed off 0001-resumable-checkout (released T-02, pushed main, pushed your uncommitted edits).
To continue in any tool, machine or account, say "pick up" there (or run `specweave pickup`).
```

The second clone ran as Codex. One command brought in the handoff and printed the next task:

```text
$ specweave pickup
Picked up the handoff from claude@cloud 0m ago (out of tokens): applied 7 uncommitted files.
SpecWeave pickup · you are codex@laptop
Increment 0001-resumable-checkout "Resumable checkout" (active) · tasks 1/2 done · ACs 0/2 met
Next: T-02 Restore the draft on return
  AC-01: Returning within 24 hours restores the cart and shipping choice
  AC-02: A paid order is never restored
  Files: src/restore.js | Test: npm test
  claim: specweave task claim T-02 0001-resumable-checkout
Spec: .specweave/increments/0001-resumable-checkout/spec.md
Branch: main @ 76b1964 · in sync with origin/main · 3 uncommitted files
Last handoff: claude@cloud 0m ago: out of tokens · next: finish restore on return
Notes:
- claude@cloud 0m ago: Payment thread: drafts must never store card data
```

Codex then claimed T-02, finished it with `specweave task done T-02 --run "npm test"`, and `specweave verify` reported both acceptance criteria met. `specweave report` wrote an HTML timeline of the whole run from the ledger: [open the recorded report](pathname:///evidence/handoff-demo.html).

{/* Evidence slot: when the recorded report of a real handoff between accounts lands at static/evidence/handoff-3.0.html, link it here and set handoffEvidence in src/components/landing/content.tsx. */}

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
