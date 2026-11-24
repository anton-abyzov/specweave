---
title: "OpenSpec vs Spec Kit: which spec tool to use"
description: "OpenSpec and GitHub Spec Kit compared from their own docs: install, workflow, files, supported agents and how each one works in an existing codebase."
slug: /compare/openspec-vs-spec-kit
keywords: [openspec vs spec kit, spec kit vs openspec, openspec vs github spec kit, openspec or spec kit, spec-driven development tools, speckit, openspec]
---

# OpenSpec vs Spec Kit

OpenSpec and GitHub Spec Kit are two widely used open-source tools for spec-driven development: you write down what a change should do, and an AI coding agent works from that instead of from a chat message. Both are MIT licensed, both run inside the agent you already use, and neither asks for an account or an API key of its own (your coding agent still needs its own sign-in). They differ in how much they write before code and in what they keep afterwards.

This page describes both tools as their repositories document them on November 24, 2026: [OpenSpec v2.1.1](https://github.com/Fission-AI/OpenSpec) (about 75,600 stars) and [Spec Kit 1.4.4](https://github.com/github/spec-kit) (about 151,000 stars). SpecWeave, mentioned at the end, is our project.

## At a glance

| | OpenSpec | Spec Kit |
|---|---|---|
| **Made by** | Fission AI | GitHub |
| **Install** | `curl -fsSL https://openspec.dev/cli/install.sh \| sh`, Homebrew, or `npm install -g @fission-ai/openspec` (Node 22.20+ for npm) | `uv tool install specify-cli` (Python 3.11+ and uv) |
| **Set up a project** | `openspec init` | `specify init my-project`; it asks which agent to set up, or takes `--integration <key>` (Copilot is the default when it cannot ask) |
| **Unit of work** | A change: `openspec/changes/<name>/` | A feature: `specs/NNN-feature/`; a branch per feature is optional, through the Git extension |
| **Files per unit** | `proposal.md`, `specs/`, `design.md`, `tasks.md` | `spec.md`, `plan.md`, `tasks.md`, plus `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| **Main workflow** | propose, apply, archive | constitution (once), specify, plan, tasks, implement, converge |
| **After the change** | Archived to `openspec/changes/archive/`; its spec deltas update the lasting specs | The feature folder stays as the record |
| **Project-wide rules** | `openspec/config.yaml` (schema, context and rules), next to the lasting specs | A constitution in `.specify/memory/constitution.md` |
| **Agents** | "30+ tools", listed on openspec.dev | GitHub Copilot by default; other agents through integrations |

## How OpenSpec works

OpenSpec treats your specs as a lasting description of what the system does, and each piece of work as a change to it. The default commands are short:

1. `/openspec-explore` (optional): think the idea through with the agent.
2. `/openspec-propose <name>`: write the proposal, the spec changes and the tasks.
3. `/openspec-apply-change`: implement the tasks.
4. `/openspec-archive-change`: move the change to the archive and fold its spec changes into the lasting specs.

OpenSpec collects anonymous telemetry by default; `OPENSPEC_TELEMETRY=0` or `DO_NOT_TRACK=1` turns it off. An expanded profile adds commands to continue, fast-forward, verify and bulk-archive changes. Codex uses `$openspec-propose` instead of the slash form, and OpenSpec 1.x used `/opsx:*` names, so older tutorials look different. Spec changes are written as deltas such as `## ADDED Requirements`, and the README says it is "built for brownfield not just greenfield". In an existing repository you run `openspec init` and propose the next change; the lasting specs grow from each archived change, so you never have to describe the whole system up front.

## How Spec Kit works

Spec Kit walks a feature through fixed steps, each writing its own file:

1. `/speckit-constitution`: the project's principles, once per project.
2. `/speckit-specify`: what to build and why, in `spec.md`.
3. `/speckit-plan`: the technical plan, with research, a data model and contracts.
4. `/speckit-tasks`: the task list.
5. `/speckit-implement`, then `/speckit-converge`: build, and repeat until converge reports `Converged`.

The README uses the hyphen form, which it credits to GitHub Copilot's skill syntax; other docs and older guides use dots (`/speckit.specify`). Optional extensions add bug-fix and idea-assessment flows. For existing code, Spec Kit's [existing-projects guide](https://github.github.io/spec-kit/how-to/existing-projects.html) says to run `specify init --here --force --integration <key>` in the repository, write a constitution with the rules that matter (for example, keep the public API compatible and run the existing test suites), and specify only the change you intend to make, such as adding CSV export to an existing page. It warns against making "document the entire existing system" your first step.

## Which one to pick

**Pick OpenSpec** when you want a running record of how the system behaves, updated one reviewed change at a time, and short commands that stay out of the way. It suits a codebase that already exists and changes in small steps.

**Pick Spec Kit** when you want the agent to think a feature through before writing code: principles, a plan, research and contracts, then tasks. It suits larger new features and teams that want the same steps every time, at the cost of more files to read and review per feature.

## Related: SpecWeave

[SpecWeave](/docs/overview/introduction/) is our own spec tool, so read this paragraph with that in mind. It keeps one short `spec.md` per piece of work with an append-only task ledger, and focuses on task claims, stored test output and moving a half-finished task to another agent. The head-to-head pages are [OpenSpec vs SpecWeave](/docs/compare/specweave-vs-openspec/) and [GitHub Spec Kit vs SpecWeave](/docs/compare/specweave-vs-github-spec-kit/).

## Common questions

**Can I use OpenSpec or Spec Kit with Claude Code and Codex?** Yes. Both install their commands into the agent you choose; OpenSpec lists more than 30 tools, and Spec Kit has integrations beyond Copilot.

**Which is lighter?** OpenSpec writes fewer files per unit of work and has fewer steps. Spec Kit's steps produce more documents before any code.

**Do they need an account or API key?** Not for the tools themselves. Your coding agent needs whatever sign-in or key it normally uses.

**Can I switch later?** Both keep plain Markdown in your repository, so the specs stay readable whichever tool you move to.

## See also

- [Spec-driven development tools compared](/docs/compare/spec-driven-development-tools/): OpenSpec, Spec Kit, BMAD, Kiro and SpecWeave in one table
- [OpenSpec vs SpecWeave](/docs/compare/specweave-vs-openspec/)
- [GitHub Spec Kit vs SpecWeave](/docs/compare/specweave-vs-github-spec-kit/)
- [All comparisons](/docs/compare/)
