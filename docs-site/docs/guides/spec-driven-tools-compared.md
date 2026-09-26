---
title: "SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro"
description: "OpenSpec, GitHub Spec Kit, the BMAD Method, Kiro and SpecWeave compared: files, workflow, proof of done, and what happens when you switch AI coding tools mid-task."
slug: /compare/spec-driven-development-tools
keywords: [openspec alternative, spec kit alternative, bmad method, kiro specs, spec-driven development tools, openspec vs spec kit]
---

# SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro

All five tools start from the same observation: an AI coding agent works better from a written spec than from a chat message. They differ in how much they write before coding, where progress is kept, and what happens when the session ends.

This page describes each tool as its public documentation presents it in September 2026. They all change quickly, so check each project's docs for the current state. SpecWeave is our project, so read this page with that in mind.

## At a glance

| | OpenSpec | GitHub Spec Kit | BMAD Method | Kiro | SpecWeave 3.0 |
|---|---|---|---|---|---|
| **What it is** | Node CLI plus slash commands | Python CLI (`specify`) plus slash commands | Set of agent personas and workflows | AWS's agentic IDE and CLI | Node CLI plus skills |
| **Unit of work** | A change folder | A feature folder under `specs/` | Epics and story files | A spec folder under `.kiro/specs/` | An increment |
| **Files per unit** | Proposal, tasks, optional design, spec deltas | `spec.md`, `plan.md`, `tasks.md` and supporting files | Brief, PRD, architecture, then one file per story | `requirements.md`, `design.md`, `tasks.md` | One `spec.md` and an append-only `ledger.jsonl` |
| **Long-lived specs** | Yes: archiving merges deltas into `openspec/specs/` | Per feature | PRD and architecture documents | Per feature, plus steering files | Living docs are optional |
| **Task progress** | Checkboxes | Checkboxes | Story status | Task list in the IDE | Ledger entries with the tool and host that made them |
| **Proof a task is done** | Up to the agent | Up to the agent | QA agent review | Up to the agent | `task done --run "<test>"` stores the output; a failing command is refused |
| **Switching tool or account mid-task** | Files are in git; no handoff step | Files are in git; no handoff step | Files are in git; no handoff step | Specs are portable; the session stays in Kiro | `specweave handoff` and `specweave pickup` |
| **Works in** | Most coding agents | Most coding agents | Most coding agents | Kiro | Any agent that reads `AGENTS.md` or runs a shell |

## OpenSpec

[OpenSpec](https://github.com/Fission-AI/OpenSpec) keeps the current behavior of your system in `openspec/specs/`. Each change gets a folder with a proposal, a task list and spec deltas that mark requirements as added, modified or removed. When the change ships, archiving merges the deltas into the main specs. It is light, works in most coding agents, and handles existing codebases well, because you only describe what changes.

**Pick OpenSpec** when you want a lasting, reviewable record of what the system does and a small, fast change workflow.

**SpecWeave differs** in what happens during the change: task claims with a lease, stored test output for each task, a closing gate, and a handoff that moves the work to another tool with the uncommitted edits.

## GitHub Spec Kit

[Spec Kit](https://github.com/github/spec-kit) walks a feature through a constitution, a spec, a plan and a task list with slash commands such as `/speckit.specify`, `/speckit.plan` and `/speckit.tasks`. Plans can include research notes, data models and API contracts.

**Pick Spec Kit** when one developer and one agent are building a feature in one sitting and you want a guided path through the design.

See [SpecWeave vs GitHub Spec Kit](/docs/guides/specweave-vs-speckit) for a longer comparison.

## BMAD Method

The [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) gives the agent a team of roles: analyst, product manager, architect, scrum master, developer and QA. Planning produces a brief, a PRD and an architecture document, which are then split into story files that the developer agent implements one at a time.

**Pick BMAD** for a new product where the planning itself is the hard part, and you want each role's output as a separate document.

**SpecWeave differs** by keeping planning to one short spec per change, so an agent resuming work reads one file. That makes it lighter for ongoing work on an existing product.

## Kiro

[Kiro](https://kiro.dev) is an IDE from AWS. It turns a prompt into `requirements.md` (user stories with EARS-style acceptance criteria), `design.md` and `tasks.md`, and adds steering files and agent hooks. The spec workflow is built into the editor.

**Pick Kiro** when you want specs, hooks and the agent in one editor and are happy to work in Kiro.

**SpecWeave differs** by working in the tools you already use (Claude Code, Codex, Cursor, Copilot, Gemini CLI, Grok Build), and by letting you move one task between them.

## Where SpecWeave fits

SpecWeave is for work that outlives one session: a feature that runs into a usage limit, parallel Claude Code Projects threads, or a team where Claude Code and Codex both touch the same repository.

- **Hand off and pick up.** `specweave handoff` releases your task claims and pushes the branch and a snapshot of your uncommitted edits. `specweave pickup` in the next tool applies them and prints the next task with its acceptance criteria. See [Handoff and pickup](/docs/guides/cross-tool-handoff).
- **Evidence instead of checkboxes.** A task is done when its test command exited 0 and the output was stored.
- **One small instruction file.** `AGENTS.md` is about 760 tokens, and `CLAUDE.md` imports it.

## Using them together

These tools are not mutually exclusive. OpenSpec's living specs and Spec Kit's or BMAD's planning documents are good input for a SpecWeave increment. Copy the requirements into Acceptance Criteria, the design into Approach, and the tasks into the Tasks section, then use SpecWeave to track, prove and hand off the work.

## See also

- [What is SpecWeave?](/docs/overview/introduction)
- [Claude Code vs Codex: use both](/docs/guides/claude-code-vs-codex)
- [AGENTS.md vs CLAUDE.md](/docs/guides/agents-md-vs-claude-md)
