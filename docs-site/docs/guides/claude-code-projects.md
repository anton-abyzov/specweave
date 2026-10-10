---
title: "Claude Code Projects and threads with SpecWeave"
description: "How SpecWeave 3.0 maps Claude Code Projects, threads and project memory onto increments, and how that work carries over to Codex, Grok and a second Claude account."
---

# Claude Code Projects and threads

A Claude Code Project is a shared workspace: a goal, instructions, repositories, project memory and many threads, each thread a cloud session that works on one branch and usually opens one pull request. That is the same shape as a SpecWeave increment, so 3.0 maps them one to one.

## The mapping

| Claude Code Projects | SpecWeave 3.0 |
|---|---|
| The project goal and instructions | The project goal and `AGENTS.md` |
| Project memory (`MEMORY.md` plus one file per fact) | `.specweave/memory/`, same format, committed to git |
| A thread (one session, one branch, one PR) | One increment |
| The thread's status checklist | The `## Tasks` section of that increment's `spec.md`, with state in `ledger.jsonl` |
| A thread's session | A `session` event in the increment's ledger (tool, session id, model) |
| One thread passing a note to another | A `note` event appended to the other increment's ledger |

## One thread, one increment

Start each thread on its own increment. The thread's checklist and the increment's task list are the same list, and the pull request closes the increment.

When a new request touches files that an open increment's tasks already own, it is more scope for that increment: add acceptance criteria and tasks there instead of opening a second one. When two open increments turn out to own mostly the same files, let one supersede the other:

```bash
specweave create-increment "Checkout recovery v2" --supersedes 0042
```

## Threads talking to each other

When one thread needs something from another thread's increment, it leaves a note rather than editing that increment's files:

```bash
specweave note "The API now returns drafts sorted by date" 0043
```

The owning thread sees it the next time it runs `specweave pickup`. This keeps each increment owned by one session, which is what makes parallel threads safe.

## Why the memory folder matters

Claude Code project memory lives in claude.ai, under one account. It does not move to a second Claude subscription, and Codex or Grok never see it. A committed `.specweave/memory/` in the same `MEMORY.md` plus one-file-per-fact format travels with the code, so any tool on any account starts from the same decisions.

## Skills in cloud threads

Plugins declared in a repository's `.claude/settings.json` do not load in Projects threads, but skills committed under `.claude/skills/` do. `specweave init` installs namespaced project skills (`sw-do`, `sw-review` and the rest) there, so a thread can use SpecWeave with no plugin setup.

## The same model in other tools

| Tool | Reads | Skills from |
|---|---|---|
| Claude Code and Projects threads | `CLAUDE.md`, which imports `AGENTS.md` | `.claude/skills/` |
| Codex | `AGENTS.md` | `.agents/skills/` |
| Grok Build | `AGENTS.md` and `CLAUDE.md` | `.grok/skills/`, `.agents/skills/`, Claude Code skills |
| Cursor, GitHub Copilot, Gemini CLI | `AGENTS.md` | Their own skill folders, or the CLI directly |

Everything else is in git, which is the one thing every tool and every account shares. To move a thread's work to another tool or account, tell the thread to hand off (or run `specweave handoff`), then run `specweave pickup` in the next tool. The handoff travels through git, so a cloud thread and a laptop see the same thing. See [Cross-tool handoff](./cross-tool-handoff.md).
