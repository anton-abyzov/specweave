---
description: Keep a project's goal, decisions, work items, artifacts and briefs portable across AI tools and accounts. Use for project coordination, "project brief", "what is this project about".
argument-hint: "[show|init|set|brief|work-add|artifact-add|routine-add]"
version: 3.0.0
---

# sw-project: shared intent across tools

Your tool runs the work; SpecWeave keeps what every tool and account must share, in the
repository: the goal (`.specweave/project/hub.json`), durable decisions
(`.specweave/memory/`), work items, artifacts and routine definitions.

## Steps

1. Read AGENTS.md and `.specweave/memory/MEMORY.md`, then `specweave project show --json`.
   No project yet: `specweave project init --name "Name" --goal "Goal"` (works without Git).
2. Keep the goal and shared context current with `specweave project set --revision N
   --goal "..."` or `--context-file ctx.md`. Read the latest revision first; a stale
   write fails instead of overwriting another session.
3. Decisions that must outlive this session: one file per fact in `.specweave/memory/`
   and one line for it in `MEMORY.md`. Never store secrets or a copy of the conversation.
4. One work item per outcome: `specweave project work-add --title "Outcome" --summary
   "Scope and expected evidence"`, reusing existing items. Engineering work links an
   increment with `--increment 0042`; its ledger and `specweave verify` stay authoritative.
5. A fresh assignment for another tool: `specweave project brief --intent ID --harness codex`
   (or `claude`, `generic`). It is a snapshot, not proof anything started.
6. Record who ran it when known: `specweave project work-record --intent ID --revision N
   --harness codex --session ID`. Omit model and effort when unknown.
7. Deliverables: `specweave project artifact-add --revision N --title "Report" --location
   reports/report.md --intent ID` (files stay in place; HTTPS links work).
   `specweave project work-update --intent ID --revision N --state review` marks review
   readiness; it is not verification.
8. Routines are definitions: `specweave project routine-add --revision N --title "Weekly
   review" --cadence "Mondays 09:00" --instructions-file routine.md`. Only configure a
   real scheduler when the user has authorized recurring runs.

Follow your tool's own task and subagent rules and the user's authorization; never
invent a task or session id. `specweave dashboard` shows the hub, work board and sessions.

## Manual path (no CLI)

Keep the goal and decisions as files in `.specweave/memory/` with the `MEMORY.md` index,
commit them, and write briefs by hand from those files.
