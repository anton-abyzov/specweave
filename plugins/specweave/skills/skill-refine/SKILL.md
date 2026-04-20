---
description: "Refine an existing skill's SKILL.md against accumulated gate-failure signals. Use when saying 'sw:skill-refine', 'refine skill', 'improve skill', 'skill refinement', or responding to a session-end nudge suggesting refinement. One skill per invocation; user approval required; never runs during an active /sw:do or /sw:done session (ADR-0671-01)."
argument-hint: "<skill-slug> [--dry-run] [--show-signals] [--scope project|user] [--last-n N]"
allowed-tools: Read, Bash
context: fork
model: opus
---

# sw:skill-refine — Targeted Skill Refinement Loop

Propose and apply minimal, auditable edits to an existing `SKILL.md` using evidence collected by the closure gates (`sw:judge-llm`, `rubric`, `sw:code-reviewer`).

**Inputs:** `<skill-slug>` (e.g. `sw:architect`) + refinement signals under `.specweave/state/skill-signals.json`.
**Output:** a reviewed git commit on the local branch (never pushed) plus a ledger entry at `.specweave/state/skill-refinements.json`.

## Red lines (inherited from ADR-0671-01..04)

1. **No runtime mutation.** This skill refuses to run when `SPECWEAVE_SESSION_ACTIVE` is set or `.specweave/state/active-session.lock` exists. Refinements happen *between* sessions, as an explicit human action.
2. **No auto-apply.** Every diff requires explicit approve / reject / edit from the human at the terminal. There is no `--yes` flag and none will be added.
3. **One skill per invocation.** `sw:skill-refine sw:a sw:b` is a usage error. Refinements must stay scoped.
4. **Never pushes.** `git commit` only — reviewing the commit and pushing stays with the user.

## Usage

```bash
# Inspect signals without proposing a diff (no LLM call)
sw:skill-refine sw:architect --show-signals

# Propose a diff, print it, do not write anything
sw:skill-refine sw:architect --dry-run

# Full interactive flow: aggregate → Haiku diff → approve/reject/edit → commit + ledger
sw:skill-refine sw:architect

# Refine a user-scoped skill at ~/.claude/skills/<dir>/SKILL.md
sw:skill-refine my-skill --scope user

# Override default N=5 increment window
sw:skill-refine sw:architect --last-n 3
```

## Workflow

1. **Parse flags** — `<skill-slug>` (required), `--dry-run`, `--show-signals`, `--scope project|user`, `--last-n N`. Exactly one skill per invocation.
2. **Session-lock guard** — refuse if in an active `/sw:do` or `/sw:done` session. See ADR-0671-01.
3. **Resolve SKILL.md path** — `project` ⇒ `.claude/skills/<slug-dir>/SKILL.md`; `user` ⇒ `~/.claude/skills/<slug-dir>/SKILL.md`. Slug `sw:foo` maps to directory `sw-foo` (flat-dir convention).
4. **Aggregate signals** — read `.specweave/state/skill-signals.json`, filter to refinements targeting the given skill within the last N increments (default 5). Break down by source + severity.
5. **`--show-signals` short-circuit** — pretty-print the aggregate and exit; no LLM call.
6. **Haiku diff proposal** — call `claude-haiku-4-5-20251001` at `temperature=0` with `(current SKILL.md, signal aggregate)`. Return `{ diff, rationale }`. Determinism: repeat runs with identical inputs produce byte-identical output (AC-US2-02).
7. **`--dry-run` short-circuit** — print diff + rationale; exit. No ledger entry, no commit.
8. **Interactive approval** — show diff + rationale, prompt `approve / reject / edit`. Edit loops at most 3 times before auto-reject.
9. **On approve** — `git apply` the patch, `git add -- <SKILL.md>`, `git commit -m "refine(<skill>): <rationale>"`. Record the commit SHA in `.specweave/state/skill-refinements.json` with `status: "applied"`. Never pushes.
10. **On reject** — write a rejection ledger entry with the user's reason. SKILL.md is untouched.

## Signals

Refinement signals are emitted by the closure gates when a gate failure traces to a specific skill's instructions:

| Source | Emitted when |
|---|---|
| `judge-llm` | `judge-llm-report.json` finding cites a skill slug as the root cause |
| `rubric` | A rubric criterion fails and the rationale traces to a skill-directed behavior |
| `code-reviewer` | A critical finding is attributable to skill-directed behavior |

Attribution is intentionally high-precision / low-recall — a missing signal is better than a wrongly-blamed skill.

## Files

- `plugins/specweave/skills/skill-refine/SKILL.md` — this file (the user-facing skill definition)
- `src/skills/skill-refine.ts` — CLI entry point (`runSkillRefine`)
- `src/core/skill-refine/aggregator.ts` — signal aggregation + breakdown
- `src/core/skill-refine/haiku-diff.ts` — Haiku-backed diff proposal (temperature 0, deterministic)
- `src/core/skill-refine/approval.ts` — interactive approve/reject/edit (via `@inquirer/prompts`)
- `src/core/skill-refine/apply.ts` — write + `git apply` + `git commit` + ledger append
- `src/core/skill-refine/ledger.ts` — append-only `.specweave/state/skill-refinements.json` writer
- `src/types/skill-refinements.ts` — ledger types + zod schema

## When this skill activates

- User says `sw:skill-refine`, `refine skill`, `improve skill`, `skill refinement`.
- User responds to a session-end nudge (see `sw:reflect`) that suggests refining a specific skill.

## ADRs

- [ADR-0671-01](../../../../.specweave/docs/internal/architecture/adr/0671-01-no-runtime-skill-mutation.md) — No runtime mutation of active skills.
- [ADR-0671-02](../../../../.specweave/docs/internal/architecture/adr/0671-02-registry-version-immutability.md) — Registry version immutability.
- [ADR-0671-03](../../../../.specweave/docs/internal/architecture/adr/0671-03-no-self-improving-marketing.md) — No "self-improving" marketing.
- [ADR-0671-04](../../../../.specweave/docs/internal/architecture/adr/0671-04-no-goodhart-loop.md) — No Goodhart loop on gate signals.

## Error handling

- Missing SKILL.md → print the resolved path, exit with `no-diff` status.
- Zero signals → print "no signals for `<skill>` in the last N increments", exit cleanly.
- Haiku returns malformed JSON → surface the raw output, abort; the ledger is not touched.
- `git apply` fails → SKILL.md is restored from the pre-call snapshot, no commit, no ledger entry.
- `ANTHROPIC_API_KEY` unset → clear error before any prompt or write.
