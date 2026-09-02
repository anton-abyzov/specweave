---
sidebar_position: 0
title: SpecWeave 2.0
description: What SpecWeave 2.0 is, what it removed, and how to upgrade.
---

# SpecWeave 2.0

> **One folder per unit of work, six commands, and an append-only ledger any tool can write to.**

SpecWeave 1.x grew to 51 skills, 73 command files, a three-report closure pipeline and an auto-generated documentation tree. 2.0 keeps the parts that were used and deletes the parts that were not. The evidence behind each cut is in [What was removed, and why](#what-was-removed-and-why).

---

## The unit of work

Everything still lives in one folder:

```
.specweave/increments/0042-checkout-flow/
  metadata.json     id, status, type, externalLinks, closeReason, supersedes
  spec.md           Problem · Scope · ACs · Approach · Open questions
  tasks.md          task definitions + the rendered board
  ledger.jsonl      append-only state (claims, done, skip, block, release)
  handoff.md        <= 1 page, written whenever you stop
  reports/          evidence: verify.json, review.md, free-form notes
  reports/artifacts/  binaries (gitignored)
```

Only those files (plus an optional `plan.md` and `scripts/`) belong in an increment root. Commit subjects start with the id: `0042: add checkout form`.

### spec.md

One evolving document, not a waterfall artifact:

- **Problem** — the intent, in the user's words.
- **Scope** — what is and is not included.
- **Acceptance criteria** — numbered checkboxes, `- [ ] AC-01 …`. These are the definition of done and the thing `specweave verify` counts.
- **Approach** — which files change, in what order, the risks, the decisions (with ADR links) and the alternatives you rejected. In 1.x this lived in a separate `plan.md`; in 2.0 it is a section, and `plan.md` is optional overflow (`create-increment --with-plan`, and still recognised on legacy increments).
- **Open questions.**

### tasks.md and the SW:BOARD block

`tasks.md` holds task *definitions* — a heading and one field line:

```markdown
### T-01 Render the cart summary
- AC: AC-01, AC-02 | Files: src/cart.ts, src/cart.test.ts | Test: npm test -- cart
```

`Files` is the ownership unit: claiming a task claims its files, and two agents whose tasks list the same file cannot both hold a claim.

State is not stored here. Every ledger write re-renders a table between two markers so the file stays the readable view:

```markdown
<!-- SW:BOARD -->
| Task | State | By | Evidence |
|------|-------|----|----------|
| T-01 | done | claude@mbp | 9f31c2e · npm test -- cart (exit 0) |
| T-02 | claimed | codex@mbp | |
<!-- /SW:BOARD -->
```

Never hand-edit that block — `specweave task done|skip|render` rewrites it.

### ledger.jsonl

The only mutable task state, one JSON object per line, append-only:

```json
{"t":"T-01","e":"claim","by":"claude@mbp","at":"2026-09-02T10:00:00Z"}
{"t":"T-01","e":"done","by":"claude@mbp","at":"2026-09-02T11:20:00Z","evidence":"9f31c2e · npm test -- cart (exit 0)"}
```

- Events: `claim`, `done`, `release`, `block`, `skip`.
- Lines are never edited or deleted; state is *derived* by folding the file, so the fold is order-independent.
- Writes are single-line appends, which are atomic on every major OS — two agents in one working tree never tear each other's lines.
- `init` and `update` write `**/ledger.jsonl merge=union` into `.gitattributes`, so a git conflict across worktrees concatenates both sides instead of forcing a manual merge.
- The fold tolerates BOM, CRLF, blank and malformed lines: junk is skipped and counted, never fatal.
- The earliest live claim wins. A claim older than the lease (2 hours by default) is **stale** and may be re-claimed.
- `done` requires evidence — a test command that exited 0 and a commit sha. `skip` requires a reason and is terminal.

### handoff.md

A one-page, secret-scrubbed document built from durable state (the ledger fold, spec ACs, decisions, the git diff) — not from any tool's private transcript. Write it whenever you stop; the PreCompact hook writes one automatically before context is compacted.

### reports/verify.json

The single closure counter. `specweave verify` runs the project's verification commands, collects the AC table and the ledger summary, and writes `reports/verify.md` + `reports/verify.json`. `verify.json.ok` is the only thing `specweave complete` blocks on.

---

## The six-command loop

Every step is a CLI command, so any tool — Claude Code, Codex, Cursor, Gemini, a human — can run it. The `sw:` skills are Claude Code wrappers around the same commands.

| # | Command | Skill | What it does |
|---|---------|-------|--------------|
| 1 | `specweave create-increment "<title>"` | `sw:increment` | Writes `spec.md` with ACs and Approach, `tasks.md`, `metadata.json`. Approved before any code. |
| 2 | `specweave task next` → `task claim T-01` → `task done T-01 --run "<test>"` | `sw:do` | The work loop. `--run` executes through the OS shell (so `.cmd` shims work on Windows), stores the exit code and output tail as evidence, and refuses a failing command. |
| 3 | `specweave verify [id]` | — | Runs `testing.commands[]` (or auto-detects test/lint/build), writes `reports/verify.json`. |
| 4 | — | `sw:review` | Fresh-context adversarial review. Every finding cites `path:line` and is re-verified before it is reported. Writes `reports/review.md`. Recommended for anything that ships; never blocking. |
| 5 | `specweave complete <id>` | `sw:done` | Refuses without a green `verify.json` unless you pass `--reason`. Syncs GitHub if configured. |
| 6 | `specweave handoff [id]` | `sw:handoff` | Portable handoff doc. Also fires automatically on PreCompact. |

Extra verbs you will actually use:

```bash
specweave task skip T-07 --reason "endpoint already exists"   # terminal, reason required
specweave task release --all-mine                             # drop your claims when you stop
specweave task list                                           # who owns what
specweave status                                              # active increments
specweave complete --all --reason "batch triage"              # batch closure
```

**Resuming, in any tool:** `specweave status` (or the `NNNN-*` folder whose `metadata.json` says `"status": "active"`) → read `spec.md` → read the latest `handoff.md` → `specweave task next`.

---

## Multi-agent: five rules

Parallel work is vendor-agnostic and subscription-agnostic. Coordination happens only through committed files — `tasks.md`, `ledger.jsonl`, `handoff.md`. There is no message bus and no shared memory; Claude Code's team tooling is an accelerator, never a requirement.

1. **One worktree per agent, named after the agent.** `git worktree add ../0042-claude -b inc/0042-claude`, or `claude --worktree 0042-claude`. The branch name must contain the increment id.
2. **Claim before you edit.** `specweave task claim T-01`. Edit only that task's `Files`. Need another file? Claim its task, or add a task.
3. **Never edit a ledger line or another task's status.** Append only. On a git conflict in `ledger.jsonl`, keep every line from both sides.
4. **`done` needs proof.** The task's `Test` command exit 0 plus a commit sha. Paste the output.
5. **When you stop:** `specweave task release --all-mine`, then `specweave handoff`.

`sw:team` runs this shape for you when the work has three or more disjoint lanes.

---

## Hooks

The plugin ships four hooks, all exec-form (`node` + args, no shell). 1.x wrapped every hook in `bash -c '…'`, which meant they were dead on Windows without a POSIX shell.

| Hook | Timeout | Purpose |
|------|---------|---------|
| `SessionStart` | 10s | Injects the active increment and next task as session context. |
| `PreToolUse` (`Write\|Edit`) | 10s | Guards writes under `.specweave/increments/`. Returns `{}` immediately for every other path. |
| `Stop` | 30s | The `sw:auto` loop driver, and nothing else. Stop fires every turn, so it must stay cheap and honour `stop_hook_active`. |
| `PreCompact` | 10s | Writes `handoff.md` before context is compacted. |

`hooks/run.mjs` normalises backslashes, resolves the CLI via `require.resolve('specweave')` from `CLAUDE_PROJECT_DIR` and then the global npm root, and exits 0 silently when the CLI is absent. Hooks accelerate the loop; they are never required for it.

Inspect what they did with `specweave hooks log`.

---

## Skills

Ten skills ship in the `sw` plugin:

`increment` · `do` · `done` · `review` · `team` · `handoff` · `sync` · `auto` · `brainstorm` · `qa`

`review` is the merge of the old `grill`, `code-reviewer` and `judge-llm`. `team` is the merge of `team-lead` and `team-merge`. `done`, `handoff` and `auto` carry `disable-model-invocation: true` so the model cannot fire them on its own.

Five standalone skills under `skills/` are distributed through vskill for non-Claude tools, and carry the full manual procedure so they work with no CLI at all: `sw-increment`, `sw-do`, `sw-task`, `sw-review`, `sw-handoff`.

---

## Configuration

`.specweave/config.json` has an exact key surface in 2.0. Anything else produces one warning line on load.

```json
{
  "version": "2.0",
  "project": { "name": "my-app" },
  "adapters": { "default": "claude" },
  "testing": {
    "mode": "TDD",
    "commands": ["npm test", "npm run lint"],
    "coverage": { "unit": 95, "integration": 90, "e2e": 100 }
  },
  "limits": { "activeIncrements": 3 },
  "planning": { "deepInterview": "off" },
  "livingDocs": false,
  "sync": { "enabled": false }
}
```

`limits.activeIncrements` is **advisory**: exceeding it prints one info note and blocks nothing. `livingDocs` is `false` by default; `"onDone"` regenerates docs when an increment completes. Full key list: [Configuration reference](/docs/reference/configuration).

---

## Upgrading

```bash
npm i -g specweave@2
specweave update
```

`specweave update` is idempotent. It:

- rewrites `CLAUDE.md` and `AGENTS.md` — the managed sections are replaced, your `## Commands` and `## Project notes` are preserved, and 1.x sections are stripped by their known headings;
- migrates `.specweave/config.json` in one pass: `testing.defaultTestMode` → `testing.mode`, `testing.coverageTargets` → `testing.coverage`, `limits.maxActiveIncrements` → `limits.activeIncrements`, `hooks.*.sync_living_docs` → `livingDocs`, `planning.deepInterview.{enabled,enforcement}` → `planning.deepInterview`, and drops `sync.mode` and the dead 1.x keys;
- records what it deleted in `.specweave/state/config-migration-2.json`, so you can see the drop list without digging through git history;
- writes the `.gitignore` and `.gitattributes` entries 2.0 needs (`**/ledger.jsonl merge=union`, ignored `.specweave/{state,logs,jobs,cache,backups}/` and `reports/artifacts/`);
- keeps backups under `.specweave/backups/`;
- refreshes the plugins.

Then run `specweave doctor`: it verifies that every command and skill named in your generated instruction files actually resolves, flags leftover `{{` placeholders, tracked files over 5 MB under `increments/`, tracked files under `.specweave/state`, and a missing `node` on PATH.

Existing increments keep working. Legacy `plan.md` is still read, and a task with a ticked checkbox but no ledger events still counts as done.

---

## What was removed, and why

The cuts came out of an audit of 17 auditors across 9 projects and 3 repositories. Each one is a measured behaviour, not a taste call.

### The three-report closure pipeline

1.x blocked `complete` on `grill-report.json`, `code-review-report.json` and `judge-llm-report.json`. **In practice those three reports were present for 33% of closed increments** — the other two thirds were closed with `--force` or by hand-writing the files. A gate that is bypassed two times out of three is not a gate; it is friction plus a false sense of coverage.

2.0 has exactly one blocking check: `reports/verify.json` with `ok: true`, produced by running the project's own commands. Review is still strongly recommended — `complete` prints a one-line notice when `reports/review.md` is missing — but it never blocks, because a review that cannot be bypassed will be bypassed.

### Auto-generated living documentation

1.x regenerated a documentation tree (and diagram JPGs) on every closure. **Those files were never read** — no increment cited them, no session loaded them, and they churned the diff on every close. Living docs are now off by default (`livingDocs: false`) and opt-in as `"onDone"`; the diagram/JPG generators are gone.

### 34 of 51 skills

The plugin shipped 51 skills. **34 of them were never invoked once** across the audited history, alongside 11 deprecated stubs and 73 legacy command files in a parallel `commands/` namespace. Every one of those was a surface the model had to consider on every turn and a page the docs had to keep true.

2.0 ships 10 skills and no `commands/` namespace. Genuinely optional capabilities (TDD cycles, e2e, debugging, media, releases, skill generation) move to vskill-distributed optional skills rather than sitting in the core plugin.

### The queued sync mode

`sync.mode: "queued"` buffered external-tracker updates in an event queue and flushed them later. **It dropped events** — a flush that failed part-way left the queue and the tracker permanently disagreeing, with no reconciliation path. The key is removed by the migrator; sync is now a direct call you can see fail. GitHub is first-class; Jira and Azure DevOps are opt-in providers behind the same `specweave sync` surface.

### Also gone

| Removed | Why |
|---------|-----|
| Hard WIP cap | Blocked real work; `limits.activeIncrements` is now an advisory note. |
| `bash -c` hooks, the banner hook, no-op Stop hooks | Dead on Windows; the banner fired on every prompt for no benefit. |
| 328- and 460-line increment templates | Nobody filled them in. The 2.0 templates fit on a screen. |
| Jira/ADO multi-project, hierarchy and mapping stacks | Configuration nobody outside one workspace ever set. |
| `reflect` skill memories | Stale and duplicated across projects; the handoff doc replaces them. |
| ~70% of `.specweave/state/` | Session/state files no reader consumed. `specweave gc` purges them. |
| Dead config keys | `quality`, `grill`, `codeReview`, `qualityGates`, `contextBudget`, `reflect`, `skillGen`, `statusLine`, `archiving`, `deduplication`, `apiDocs`, `documentation`, `translation`, `language`, `billing`, `cache`, `incrementAssist`, `pluginAutoLoad`. |

---

## See also

- [Cross-tool handoff](/docs/guides/cross-tool-handoff)
- [GitHub sync](/docs/guides/github-sync) · [Jira and Azure DevOps](/docs/guides/jira-ado-sync) · [`specweave sync` reference](/docs/reference/sync-cli)
- [Commands reference](/docs/reference/commands) · [Skills reference](/docs/reference/skills) · [Configuration](/docs/reference/configuration)
