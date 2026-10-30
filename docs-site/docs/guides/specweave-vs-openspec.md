---
title: "OpenSpec vs SpecWeave: spec-driven tools"
description: "OpenSpec explained and compared with SpecWeave: proposals, specs and archives versus one spec file, task evidence and handoff from Claude Code to Codex."
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

**SpecWeave fits** work that spans sessions, tools or teammates, for one developer or a whole team: you hit usage limits, switch between Claude Code and Codex, run parallel threads, or want proof that tests ran before something is called done.

## Using both

They don't conflict. Keep OpenSpec's `openspec/specs/` as the description of the system, and when a change is big enough to span sessions, copy its proposal into an increment: requirements into Acceptance Criteria, `design.md` into Approach, and `tasks.md` into the Tasks section. Then claim, prove and hand off the tasks with SpecWeave, and archive the change in OpenSpec when it ships.

## OpenSpec alternatives

Each of these gives an AI coding agent a written spec. They differ in how much they plan up front and what they track while the work is built. The facts below come from the comparison pages linked on each line.

- **GitHub Spec Kit**: a Python CLI (`specify`) plus slash commands, with a feature folder holding `spec.md`, `plan.md` and `tasks.md`. See [GitHub Spec Kit vs SpecWeave](/docs/compare/specweave-vs-github-spec-kit/).
- **The BMAD Method**: agent personas and workflows that produce a brief, a PRD, an architecture document and one file per story. See [BMAD Method vs SpecWeave](/docs/compare/specweave-vs-bmad-method/).
- **Kiro**: an IDE from AWS that writes `requirements.md`, `design.md` and `tasks.md` under `.kiro/specs/`, with the spec workflow built into the editor. See [Spec-driven development tools compared](/docs/compare/spec-driven-development-tools/#kiro).
- **SpecWeave**: one `spec.md` per increment, an append-only ledger with test evidence, and handoff between tools and accounts, as described above.

All five side by side: [Spec-driven development tools compared](/docs/compare/spec-driven-development-tools/). Every comparison page, including coding agents and desktop workspaces: [Compare](/docs/compare/).

## See also

- [SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro](/docs/compare/spec-driven-development-tools/)
- [SpecWeave vs GitHub Spec Kit](/docs/compare/specweave-vs-github-spec-kit/)
- [SpecWeave vs the BMAD Method](/docs/compare/specweave-vs-bmad-method/)
- [Handoff and pickup](/docs/guides/cross-tool-handoff/)
- [SpecWithCode](/code/): run several coding agents on your own machines
