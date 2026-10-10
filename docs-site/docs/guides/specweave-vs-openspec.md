---
title: "SpecWeave vs OpenSpec: spec-driven development compared"
description: "OpenSpec and SpecWeave compared side by side: files, commands, how each tracks progress and proves a task is done, and what happens when you switch from Claude Code to Codex in the middle of a change."
slug: /compare/specweave-vs-openspec
keywords: [openspec, openspec vs specweave, openspec alternative, openspec claude code, openspec codex, opsx, spec-driven development, openspec review]
---

# SpecWeave vs OpenSpec

OpenSpec and SpecWeave both give an AI coding agent a written spec to work from, keep it in git, and work in most coding agents. OpenSpec is the more popular of the two and is very good at one thing: keeping a lasting record of what your system does and changing it in small, reviewed steps. SpecWeave puts its weight on what happens while a change is being built: who holds each task, proof that it passed, and moving the work to another tool when a session runs out.

This page describes OpenSpec as [its repository](https://github.com/Fission-AI/OpenSpec) documents it in October 2026. SpecWeave is our project, so read it with that in mind.

## At a glance

| | OpenSpec | SpecWeave 3.0 |
|---|---|---|
| **Install** | `npm install -g @fission-ai/openspec` | `npm install -g specweave` |
| **Unit of work** | A change folder under `openspec/changes/` | An increment under `.specweave/increments/` |
| **Files per unit** | `proposal.md`, `design.md`, `tasks.md` and spec deltas | One `spec.md` and an append-only `ledger.jsonl` |
| **Long-lived specs** | Yes: `openspec/specs/` is the source of truth, and archiving merges each change into it | Optional living docs; the increment's spec is the record |
| **Commands** | `/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive` | Skills plus a CLI: `task claim`, `task done`, `verify`, `complete`, `handoff`, `pickup` |
| **Task progress** | Checkboxes in `tasks.md` | Ledger entries with the tool and host that made them (`claude@laptop`, `codex@cloud`) |
| **Proof a task is done** | Up to the agent | `task done --run "<test>"` stores the output; a failing command is refused |
| **Several agents at once** | Not addressed | Task claims with a lease and file-overlap checks |
| **Switching tool or account mid-change** | Files are in git; no handoff step | `specweave handoff` and `specweave pickup`, including uncommitted edits |
| **Tools** | 30+ coding agents | Any agent that reads `AGENTS.md` or runs a shell |

## Where OpenSpec is strong

- **A current picture of the system.** `openspec/specs/` describes how the system behaves now. Each change says which requirements it adds, modifies or removes, and archiving folds that in. Months later, you can read the specs instead of the code.
- **Small and fast.** A change is a proposal, a design note, a task list and the deltas. There is little ceremony, which is why it works well on existing codebases.
- **Broad tool support.** Slash commands are installed for a long list of agents, with each tool's own spelling.

## Where SpecWeave is different

- **One file per piece of work.** An increment is one `spec.md` with Problem, Scope, Acceptance Criteria, Approach and Tasks. An agent resuming work reads one file and runs `specweave pickup`.
- **Evidence instead of checkboxes.** A task is done when its test command exited 0 and the output was stored. An acceptance criterion is met when the tasks that cover it are done, and `specweave complete` refuses to close work whose verification failed.
- **Claims for parallel work.** Two agents can't take the same task; a stale claim expires or can be taken over. That matters with parallel Claude Code Projects threads or a Codex cloud task running next to your laptop.
- **Handoff across tools and accounts.** When Claude Code runs out of usage halfway through a change, `specweave handoff` releases your claims, writes where you stopped and pushes your uncommitted edits; `specweave pickup` in Codex continues from there. With OpenSpec the files are in git too, but the uncommitted edits and the "where was I" are not. See [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/).

## When to use which

**OpenSpec fits** when your priority is a reviewable, always-current description of what the system does, and changes are mostly finished in one sitting.

**SpecWeave fits** when work spans sessions, tools or people: you hit usage limits, switch between Claude Code and Codex, run parallel threads, or want proof that tests ran before something is called done.

## Using both

They don't conflict. Keep OpenSpec's `openspec/specs/` as the description of the system, and when a change is big enough to span sessions, copy its proposal into an increment: requirements into Acceptance Criteria, `design.md` into Approach, and `tasks.md` into the Tasks section. Then claim, prove and hand off the tasks with SpecWeave, and archive the change in OpenSpec when it ships.

## See also

- [SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro](/docs/compare/spec-driven-development-tools/)
- [SpecWeave vs GitHub Spec Kit](/docs/guides/specweave-vs-speckit/)
- [SpecWeave vs the BMAD Method](/docs/compare/specweave-vs-bmad-method/)
- [Handoff and pickup](/docs/guides/cross-tool-handoff/)
