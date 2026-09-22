---
description: Organize ongoing code, research or content work with shared goals, context, artifacts and portable worker briefs. Use for project coordination across AI tools.
version: 2.3.0
---

# Portable project coordination

Use native host task tools to execute work; use SpecWeave to preserve shared intent,
context and outputs across hosts. This skill works without Claude-specific tools.

1. Read AGENTS.md and run `specweave project show --json`. If no project exists,
   initialize the user's chosen folder with `specweave project init --name "Name" --goal "Goal"`.
   This also works without Git. Existing umbrella state stays at the umbrella root.
2. Keep the goal and shared decisions current. Use `specweave project set --revision N`
   with `--goal` or `--context-file`; read the latest revision first. A stale write
   fails instead of overwriting another session. Store explicit project decisions,
   never secrets or an indiscriminate copy of conversation history.
3. Create a work item per distinct outcome with `specweave project work-add --title
   "Outcome" --summary "Scope and expected evidence"`. Reuse existing work items.
   Engineering work can link an increment with `--increment`; its task ledger and
   verification remain authoritative.
4. Prepare a fresh assignment with `specweave project brief --intent ID --harness codex`
   (or `claude` / `generic`). The brief includes shared context and artifact links.
   It is a snapshot, not live memory synchronization or proof that a task launched.
5. Follow the host's native task/subagent rules and the user's authorization. If
   separate tasks are authorized, pass the brief to a native task and record the
   returned session ID. Otherwise execute in the current task, sequentially if needed.
   Never invent a task ID or require parallel execution. Record known identity with
   `specweave project work-record --intent ID --revision N --harness codex --session ID`.
   Omit model/effort when unknown. A declared record is not observed usage.
6. Register deliverables with `specweave project artifact-add --revision N --title
   "Report" --location reports/report.md --intent ID`. Files remain in place; HTTPS
   links are supported. Return actual evidence and blockers. Use `specweave project
   work-update --intent ID --revision N --state review` for review readiness.
   Board state does not prove verification or replace `specweave verify`.
7. Routines are reusable definitions: `specweave project routine-add --revision N
   --title "Weekly review" --cadence "Mondays 09:00 America/New_York"
   --instructions-file routine.md`. Generate a brief with `specweave project brief
   --routine ID`. Only configure a native scheduler when the user has authorized
   recurring execution; persist its actual receipt in project context. Each run
   reloads current project files. Saving a definition alone schedules nothing.

Open `specweave dashboard` for the Project hub, Work board, Sessions and usage views.
Shared files travel with the project. Native conversations, connector credentials,
design editors, voice/mobile interfaces and scheduler runtimes stay with the host.
