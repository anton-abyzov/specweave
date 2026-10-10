---
title: "SpecWeave vs the BMAD Method: planning depth vs keeping your place"
description: "The BMAD Method and SpecWeave compared: agent roles and planning documents versus one short spec, task evidence and handoff between Claude Code, Codex and other tools."
slug: /compare/specweave-vs-bmad-method
keywords: [bmad method, bmad method vs specweave, bmad alternative, bmad method claude code, bmad method codex, bmad v6, spec-driven development, ai agile development]
---

# SpecWeave vs the BMAD Method

The BMAD Method turns one coding agent into an agile team: an analyst, a product manager, a UX designer, an architect, a scrum master and a developer, each with its own workflow and document. SpecWeave keeps planning to one short spec per change and puts its effort into tracking the work across sessions and tools. Both want the agent to build from written requirements instead of a chat message.

This page describes BMAD as [its repository and docs](https://github.com/bmad-code-org/BMAD-METHOD) present it in October 2026. SpecWeave is our project, so read it with that in mind.

## At a glance

| | BMAD Method | SpecWeave 3.0 |
|---|---|---|
| **Install** | `npx bmad-method install` | `npm install -g specweave` |
| **Shape** | Agent personas plus guided workflows | A CLI plus skills |
| **Planning** | Scale-adaptive tracks: Quick Flow (a tech spec), BMad Method (PRD, architecture, UX), Enterprise (adds security and DevOps) | One `spec.md` per increment: Problem, Scope, Acceptance Criteria, Approach, Tasks |
| **Unit of implementation** | A story file, created and implemented one at a time | A task inside the increment's `spec.md` |
| **Where output goes** | `_bmad-output/` (planning and implementation artifacts) | `.specweave/increments/NNNN-slug/` |
| **Task progress** | Sprint status and story files | Append-only `ledger.jsonl` with the tool and host that made each entry |
| **Proof a task is done** | Code review workflow | `task done --run "<test>"` stores the output; a failing command is refused |
| **Switching tool or account mid-story** | Files are in git; no handoff step | `specweave handoff` and `specweave pickup`, including uncommitted edits |
| **Tools** | Most agent IDEs, including Claude Code and Cursor | Any agent that reads `AGENTS.md` or runs a shell |

## Where BMAD is strong

- **Planning a new product.** When the hard part is deciding what to build, BMAD's analyst, PM, UX and architect workflows push you through research, requirements, user experience and architecture before any code. SpecWeave's `brainstorm` skill covers early exploration, but BMAD goes much deeper.
- **Separate documents for separate roles.** A PRD, an architecture document and a UX spec are easy to review on their own and to hand to people who don't read code.
- **Scale tracks.** A bug fix can take the Quick Flow and skip the PRD, so the ceremony grows with the project.

## Where SpecWeave is different

- **Less to read when resuming.** An agent picking up BMAD work reads the story file and, often, the PRD and architecture document it points to. A SpecWeave increment is one `spec.md`, and `specweave pickup` prints the next task with its acceptance criteria.
- **Evidence instead of status.** A SpecWeave task is done when its test command exited 0 and the output was stored. `specweave complete` refuses to close an increment whose verification failed.
- **Claims for parallel work.** Task claims with a lease stop two agents, or two Claude Code Projects threads, from taking the same task.
- **Handoff across tools and accounts.** Long BMAD sessions are exactly the ones that run into a Claude Code usage limit. `specweave handoff` pushes where you stopped and your uncommitted edits, and `specweave pickup` continues in Codex, Grok Build, Gemini CLI or a second account. See [Claude Code usage limit reached: what to do next](/docs/guides/claude-code-usage-limit/).

## When to use which

**BMAD fits** a new product where the planning itself is the work, and you want each role's output as its own document.

**SpecWeave fits** ongoing work on a product that already exists: many small changes, several tools or accounts, parallel threads, and a need to prove each change passed its tests.

## Using both

Plan with BMAD, build with SpecWeave. When a BMAD epic is ready, create an increment for it: copy the story's acceptance criteria into Acceptance Criteria, link the PRD and architecture document from Approach, and turn the story tasks into `### T-01 Title` entries. The planning documents stay where BMAD wrote them; the build gets claims, test evidence and handoff.

## See also

- [SpecWeave vs OpenSpec, Spec Kit, BMAD and Kiro](/docs/compare/spec-driven-development-tools/)
- [SpecWeave vs OpenSpec](/docs/compare/specweave-vs-openspec/)
- [SpecWeave vs GitHub Spec Kit](/docs/guides/specweave-vs-speckit/)
- [Switch from Claude Code to Codex without losing your place](/docs/guides/switch-claude-code-to-codex/)
