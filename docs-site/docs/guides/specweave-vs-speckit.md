---
title: "SpecWeave vs GitHub Spec Kit: what happens after the spec"
description: "GitHub Spec Kit and SpecWeave 3.0 compared: where they overlap, how they differ after the spec is written, and what happens when you switch from Claude Code to Codex mid-feature."
keywords: [github spec kit, spec kit, spec kit vs specweave, spec kit alternative, speckit, specify cli, spec kit claude code, spec kit codex, spec-driven development]
sidebar_position: 5
---

# SpecWeave vs GitHub Spec Kit

Both tools are built on the same idea: an AI coding agent does better work from a written specification than from a chat message. They differ in what happens after the spec is written.

GitHub released [Spec Kit](https://github.com/github/spec-kit) in 2025. It gives an agent a set of slash commands that walk a feature from principles to code. SpecWeave 3.0 keeps each piece of work in one spec file with an append-only task ledger, so the work can be claimed, proved, handed off to another tool and closed.

This page describes Spec Kit as its public repository documents it. Check the repository for its current state.

## At a glance

| | Spec Kit | SpecWeave 3.0 |
|---|---|---|
| **Unit of work** | A feature folder under `specs/` | An increment in `.specweave/increments/NNNN-slug/` |
| **Files per feature** | `spec.md`, `plan.md`, `tasks.md`, plus supporting files such as research and contracts | One `spec.md` (Problem, Scope, Acceptance Criteria, Approach, Open questions, Tasks); `plan.md` optional |
| **Workflow** | `/speckit.constitution`, `/speckit.specify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`, with optional clarify and analyze steps | `specweave create-increment`, then `task claim` and `task done`, `verify`, `complete` |
| **Task progress** | Checkboxes in `tasks.md` | Append-only `ledger.jsonl`; nothing written back into markdown |
| **Proof a task is done** | Up to the agent | `task done --run "<test>"` stores the real output; a failing command is refused |
| **Closing** | No closure step | `complete` requires a passing `specweave verify` (tests, lint, build, every AC met) or an explicit reason |
| **Several agents at once** | Not addressed | Task claims with a lease, file-overlap checks, `merge=union` on the ledger |
| **Switching tool or account mid-task** | Not addressed | `specweave handoff` and `specweave pickup` |
| **Instruction file** | Per-agent command files | One `AGENTS.md`, imported by `CLAUDE.md` |
| **Issue trackers** | None | Optional: GitHub, Jira, Azure DevOps, only on `specweave sync push` |
| **Runtime** | Python CLI (`specify`) that scaffolds the templates | Node.js CLI (`specweave`) that also runs the loop |

## Where Spec Kit is strong

- **A guided path from idea to plan.** The constitution, specify, clarify and plan steps push you to think about principles and unknowns before any code. SpecWeave's `spec.md` asks for the same things in fewer sections, and its `brainstorm` skill covers the early exploration, but Spec Kit makes the stages more explicit.
- **Richer design artifacts.** Spec Kit plans can include research notes, data models and API contracts as separate files. SpecWeave keeps the design to an Approach section and one optional `plan.md`.
- **Nothing to run after scaffolding.** Once the files exist, the agent works from them with no extra CLI in the loop.

## Where SpecWeave is different

- **One file to read.** An agent resuming work reads one `spec.md` and runs `specweave pickup`, not three or more files.
- **State that survives more than one agent.** Claims, completions and evidence live in an append-only ledger in git. Two agents cannot both take the same task, a stale claim can be taken over, and merges keep both sides.
- **Evidence instead of checkboxes.** A task is done when its test command exited 0 and the output was stored. An acceptance criterion is met when the tasks covering it are done; nobody ticks boxes.
- **Handoff across tools and accounts.** When one tool runs out of tokens, say "hand off": `specweave handoff` pushes everything the next session needs through your git remote, and saying "pick up" in any other tool or account continues from there. See [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/).
- **A closing gate.** `specweave complete` refuses to close work whose verification failed, unless you record why.

## When to use which

**Spec Kit fits** when one developer and one agent are building a feature in one sitting, and you want a structured path through the design first.

**SpecWeave fits** when work spans sessions, tools or people: you switch between Claude Code and Codex, run parallel threads, need proof that tests ran, or want issues in GitHub or Jira to follow the work.

Nothing stops you from using both. A Spec Kit `spec.md` and `plan.md` are good input for a SpecWeave increment: copy the requirements into Acceptance Criteria, the design into Approach, and the task list into the Tasks section as `### T-01 Title` entries.

## See also

- [SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro](/docs/compare/spec-driven-development-tools/)
- [SpecWeave vs OpenSpec](/docs/compare/specweave-vs-openspec/)
- [SpecWeave vs the BMAD Method](/docs/compare/specweave-vs-bmad-method/)
- [Claude Code usage limit reached: what to do next](/docs/guides/claude-code-usage-limit/)
- [SpecWeave 3.0](/docs/guides/specweave-3)
- [What is an increment](/docs/guides/core-concepts/what-is-an-increment)
- [Why SpecWeave](/docs/overview/why-specweave)
- [GitHub Spec Kit repository](https://github.com/github/spec-kit)
