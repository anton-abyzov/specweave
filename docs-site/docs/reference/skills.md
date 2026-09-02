---
sidebar_position: 3
title: Skills
description: The ten skills in the sw plugin and the five standalone skills for other AI tools.
---

# Skills reference

SpecWeave 2.0 ships **ten skills** in the `sw` Claude Code plugin and **five standalone skills** distributed through vskill for every other tool. 1.x shipped 51 plugin skills; 34 of them were never invoked once, so they are gone — see [what was removed](/docs/guides/specweave-2#what-was-removed-and-why).

Every skill wraps the `specweave` CLI. The CLI is the source of truth; the skill adds the judgement.

---

## The `sw` plugin

### `/sw:increment`

`<what you want to build> [--supersedes <id>]`

Plans a unit of work: creates `.specweave/increments/NNNN-slug/` with `spec.md` (Problem, Scope, numbered ACs, Approach), `tasks.md` and `metadata.json`. Runs in plan mode; the spec is approved before any code is written.

### `/sw:do`

`<increment-id>`

Works the increment task by task through the ledger: `task next` → `claim` → implement inside the task's `Files` → commit with the increment id → `task done --run "<test>"`. Never hand-edits status lines.

### `/sw:review`

`<increment-id> [--full]`

Adversarial fresh-context review. Reads the spec, the diff and the surrounding code, then reports what is actually wrong — every finding cites `path:line` and is re-verified before it is reported. Writes `reports/review.md` and `reports/review.json`. `--full` fans out in parallel.

This is the merge of 1.x's `grill`, `code-reviewer` and `judge-llm`.

### `/sw:done`

`<increment-id> [--reason <text>]`

Closure: ledger check → `specweave verify` → optional review → `specweave complete`. The only hard gate is `reports/verify.json` with `ok: true`. Carries `disable-model-invocation: true` — the model cannot fire it on its own.

### `/sw:team`

Runs one increment with several agents in parallel — any vendor, any subscription. A worktree each, claims through the ledger, one closure. Coordination happens only through committed files. This is the merge of 1.x's `team-lead` and `team-merge`.

### `/sw:handoff`

`[incrementId] [--reason …] [--summary …] [--next …] [--gotcha …] [--decision …] [--inline]`

Writes a portable, secret-scrubbed handoff document so the work continues in any tool or on any machine. `disable-model-invocation: true`.

### `/sw:sync`

`push|pull|status|setup [increment-id]`

One surface for GitHub, Jira and Azure DevOps. See the [`specweave sync` reference](/docs/reference/sync-cli).

### `/sw:auto`

`[increment-ids...] [--dry-run|--reset|--all-backlog]`

Unattended execution. `specweave auto` writes a session file; the plugin's Stop hook reads it after every turn and either blocks with what remains or lets the session end. No daemon, no background process — the hook *is* the loop. `disable-model-invocation: true`.

### `/sw:brainstorm`

`<topic> [--depth quick|standard|deep]`

Diverge, converge, pick — then hand the winner to `/sw:increment`. Decides *which* thing to spec; never replaces the spec.

### `/sw:qa`

`<increment-id> [--gate|--pre|--full]`

A thin wrapper over `specweave qa`: risk score and blockers. Not the code review (`/sw:review`) and not the closure gate (`specweave verify`).

---

## Standalone skills (any AI tool)

Five skills under `skills/`, distributed through [vskill](https://verified-skill.com), that work in Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Windsurf and others. Each spells out the file formats and a manual shell/PowerShell procedure, so they work with no CLI installed at all.

```bash
npx vskill install anton-abyzov/specweave/sw-increment
npx vskill install anton-abyzov/specweave/sw-do
npx vskill install anton-abyzov/specweave/sw-task
npx vskill install anton-abyzov/specweave/sw-review
npx vskill install anton-abyzov/specweave/sw-handoff
```

| Skill | Use it when | Writes |
|-------|-------------|--------|
| `sw-increment` | planning a feature, before any code | `metadata.json`, `spec.md`, `tasks.md` |
| `sw-do` | implementing an increment, task by task | commits, ledger events, `reports/verify.json` |
| `sw-task` | claiming, finishing or skipping tasks; several agents on one increment | `ledger.jsonl` |
| `sw-review` | adversarial review before shipping | `reports/review.md` |
| `sw-handoff` | out of tokens, switching tools or machines | `handoff.md`, `handoff.diff` |

Typical loop: `sw-increment` → `sw-do` (which drives `sw-task`) → `sw-review` → `specweave complete <id>`. `sw-handoff` any time you stop.

---

## Skill conventions

- The **directory name is the command** — skills carry no `name:` frontmatter field.
- `done`, `handoff` and `auto` set `disable-model-invocation: true`.
- `npm run lint:skills` fails on a `name:` field, and on any reference to a `specweave <cmd>` or `sw:<name>` that does not exist.

## Writing your own

Custom skills live in your own plugin or are installed with vskill; they are not added to the `sw` plugin. See [Installing skills](/docs/skills/installation) and [Skill development guidelines](/docs/skills/extensible/skill-development-guidelines).
