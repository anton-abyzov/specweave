---
description: Phase-agnostic orchestrator for parallel multi-agent work — brainstorm, plan, implement, review, research, or test. Auto-detects mode from intent. Use for implementation (3+ domains or 15+ tasks), brainstorming (multiple perspectives), parallel planning (PM + Architect), code review (delegates to sw:code-reviewer), research (multiple topics), or testing (parallel test layers). Also use when user says "team setup", "parallel agents", "team lead", "agent teams", "brainstorm with agents", "plan in parallel", "review code", "research this".
version: 2.0.0
---

# Team Lead

Run one increment with N agents in parallel — **any vendor, any subscription**
(Claude Code, Codex, OpenCode, Cursor, Gemini, a human). Coordination happens
only through committed files: `tasks.md` (definitions), `ledger.jsonl`
(append-only state), `handoff.md`. No message bus, no shared memory; Claude
Code's TeamCreate/Task tools are accelerators, never requirements.

## You are the orchestrator

- You plan, split, spawn, watch, merge, close. You do **not** implement.
- Fan out when domains ≥ 3 or tasks ≥ 15 or the user asked for parallel work; otherwise `sw:do` directly.
- One increment, one `tasks.md`, one ledger. Do not create per-agent increments.

## The 5 rules every agent gets (paste verbatim into each agent prompt)

1. **One worktree per agent**: `git worktree add ../<id>-<agent> -b inc/<id>-<agent>` (Claude: `claude --worktree <id>-<agent>`). Branch name contains the increment id. Set `SPECWEAVE_AGENT=<agent>` (else id = `<tool>@<host>`).
2. **Claim before edit**: `specweave task next <id>` → `specweave task claim T-NN <id>`. Edit only that task's `Files`. Need another file → claim its task or add a task.
3. **Append only**: never edit or delete ledger lines, never edit another task's state line. On a ledger merge conflict keep every line from both sides (`.gitattributes` has `**/ledger.jsonl merge=union`).
4. **Done needs evidence**: commit with the id in the subject, then `specweave task done T-NN <id> --run "<Test>"` (exit 0 required). Paste the output in your reply.
5. **When stopping**: `specweave task release --all-mine` then `specweave handoff <id>`.

No CLI on that machine? The agent appends the JSON line itself:
`{"t":"T-NN","e":"claim|done|release|block|skip","by":"<agent>","at":"<ISO UTC>","evidence":"<sha + test>","note":"…"}`.

## Phase 1 — Split (before spawning)

1. Read `spec.md` once. Confirm `tasks.md` is in 2.0 form: `### T-NN Title` + `- AC: … | Files: … | Test: …`. If not, rewrite it (this is the only time tasks.md changes structure).
2. **Files are the ownership unit.** Two tasks that touch the same file cannot run in parallel: merge them into one task or add `**Dependencies**: T-NN`. Shared contracts (types, API schemas, migrations) go into an early task that everything else depends on.
3. Group tasks into lanes (backend / frontend / db / tests / docs …) so each lane's Files are disjoint. Lanes = agents. 2–5 agents; more rarely helps.
4. Run `specweave task list <id>` — it must show every task `open`. Commit `tasks.md`.

## Phase 2 — Spawn

For each lane spawn one agent (Claude: `Task({ subagent_type: "general-purpose", … })` or a TeamCreate teammate; other vendors: a terminal in the lane's worktree with the prompt below). Prompt template:

```
You are agent <agent> on increment <id> (<title>). Worktree: <path>. Branch inc/<id>-<agent>.
Your lane: <lane name>. Tasks you may claim: T-NN, T-MM (others belong to other lanes).
Rules: <the 5 rules above>.
Loop: specweave task next <id> → claim → implement inside Files → commit "<id>: …" → task done --run.
Contract: <shared types / API / schema the lane must respect>.
When your tasks are done or you are blocked: task release --all-mine, specweave handoff <id>, then reply with:
  DONE: T-NN (sha, test output tail) | BLOCKED: T-MM (reason) | HANDOFF: <handoff.md path>
```

Agent templates for common lanes live in `agents/` (backend, frontend, database, security, testing, pm, architect, researcher, reviewer-security, brainstorm-*). `_protocol.md` is prepended automatically by `specweave team`.

## Phase 3 — Watch (cheap)

- Poll `specweave task list <id>` (or read `ledger.jsonl`) instead of chatting. `blocked` rows are your queue: unblock (provide the secret, split the task, decide) and reply to that agent only.
- Stale claim (older than `tasks.leaseHours`, default 2h) with no progress → the agent is gone: `task claim --force` by a replacement agent, or reassign the lane.
- Do not re-read agents' full diffs; read their DONE lines and the ledger evidence.

## Phase 4 — Merge

1. Every agent has released + handed off. Merge lane branches into the increment branch in dependency order; ledger conflicts resolve by union (keep all lines). tasks.md conflicts: keep both agents' state lines, then `specweave task render <id>`.
2. `specweave verify <id>` on the merged tree → `reports/verify.json`. Red → open a fix task, assign one agent, repeat.
3. `sw:review` (optional, recommended) on the merged diff → `reports/review.md`.
4. `specweave complete <id> --yes` (add `--reason` only if the user accepts a red verify). Only the lead closes.
5. Remove worktrees: `git worktree remove ../<id>-<agent>`.

## Other modes (same skeleton, different lanes)

| Mode | Lanes | Merge artifact |
|---|---|---|
| brainstorm | advocate / critic / pragmatist (see `agents/brainstorm-*.md`) | `reports/brainstorm.md`, then `sw:increment` |
| plan | pm (spec.md) + architect (Approach/plan.md) in parallel | reviewed spec.md before any task is claimed |
| review | security / logic / performance reviewers (`sw:code-reviewer` handles this) | `reports/review.md` |
| research | one topic per agent | `reports/research-<topic>.md` |
| test | unit / integration / e2e | `specweave verify` commands in `testing.commands` |

## Anti-patterns

- Agents editing files outside their task's `Files` ("I just fixed a typo there") — that is how merges break. Add a task.
- Marking `[x]` in tasks.md by hand. The ledger wins; `task render` overwrites it.
- Per-agent increments to avoid conflicts — you lose the single ledger and the single verify.
- The lead implementing "just this small piece". Spawn an agent or finish the team first.
- Closing while a claim is live. Wait for release/handoff or take it over explicitly.

## Resources

- `specweave task --help`, `specweave verify --help`, `specweave handoff --help`
- [Official Documentation](https://verified-skill.com/docs/reference/skills#team-lead)
