---
sidebar_position: 14
---

import CommandTabs from '@site/src/components/CommandTabs';

# Refine a Skill

**`sw:skill-refine <skill-slug>`** — propose an AI-authored diff against an existing skill's `SKILL.md` using evidence from recent gate failures (judge-llm, rubric, code-reviewer).

Introduced in increment [0671 — Skill Refinement Loop](https://github.com/anton-abyzov/specweave/tree/main/.specweave/increments/0671-skill-refinement-loop).

## When to use

Run `sw:skill-refine` when a skill has repeatedly produced outputs that fail closure gates. Gate-failure signals accumulate in `.specweave/state/skill-signals.json` under `type: "refinement"`. After 3+ negative signals for the same skill, `sw:reflect --status` will surface the skill as a refinement candidate.

Refinement is always an **explicit user action**. SpecWeave never edits a skill file during an active `/sw:do` or `/sw:done` session (see [ADR-0671-01](#adrs)).

## Usage

<CommandTabs
  natural='Refine the architect skill'
  claude='sw:skill-refine sw:architect'
  other='skill-refine sw:architect'
/>

Common flags:

```bash
# Inspect accumulated signals without proposing a diff
sw:skill-refine sw:architect --show-signals

# Dry-run — print the proposed diff to stdout, no writes
sw:skill-refine sw:architect --dry-run

# Target a user-scope skill (~/.claude/skills/) instead of project-scope
sw:skill-refine sw:architect --scope user

# Default scope is `project` (.claude/skills/ under the current repo)
sw:skill-refine sw:architect --scope project
```

## Arguments

| Argument | Description |
|----------|-------------|
| `<skill-slug>` | Required. Slug of the skill to refine, e.g. `sw:architect`. |
| `--dry-run` | Print the proposed diff; do not write, commit, or update the ledger. |
| `--show-signals` | Show aggregated signal data only; skip diff generation. |
| `--scope project\|user` | Which skill source to refine. `project` → `.claude/skills/<slug>/SKILL.md`. `user` → `~/.claude/skills/<slug>/SKILL.md`. Defaults to `project`. |
| `-n`, `--last-n <N>` | Number of recent increments whose signals are considered. Default `5`. |

---

## Flow

1. **Aggregate signals.** Read `.specweave/state/skill-signals.json`, filter `type: "refinement"` entries whose `targetSkill` matches the slug, restrict to the last N increments, and sort by severity × recency.
2. **Load current SKILL.md.** Resolved via `--scope` (project or user).
3. **Prompt Haiku** with `(current SKILL.md, signal summary, evidence excerpts)`, `temperature=0`. Haiku returns a unified diff plus a one-paragraph rationale.
4. **Present to user.** The diff is rendered inline with three options: approve, reject, edit-inline. Nothing is written without explicit approval.
5. **On approve**: apply the diff, `git commit -m "refine(<skill>): <rationale-summary>"`, append an entry to `.specweave/state/skill-refinements.json` (append-only ledger: author, signal IDs, diff SHA, rationale, timestamp).
6. **On reject**: record a rejection entry in the ledger with reason; leave the signals in place so they can be revisited later.

The Haiku call is deterministic: same inputs, same diff. `--dry-run` followed by a real run produces an identical proposed diff.

---

## Signal sources

Refinement signals are emitted by three closure gates:

| Source | When emitted |
|--------|--------------|
| `judge-llm` | Judge rejects an increment and its findings reference a specific skill slug in the evidence. |
| `rubric` | A rubric criterion fails and the rationale traces to a skill-authored instruction. |
| `code-reviewer` | A critical finding is attributed to skill-directed behavior. |

Each signal carries `{ source, targetSkill, severity, incrementId, evidence, detectedAt, consumedBy }`. `consumedBy` is `null` until a refinement consumes the signal; after consumption, it stores the refinement's ID from the ledger.

Signals are versioned: `skill-signals.json` uses `schemaVersion: 2`. Legacy v1 files (generation-only) are auto-migrated on first read without data loss.

---

## Attribution heuristics

Gates do not always know which skill caused a failure. Attribution applies these heuristics in priority order (first match wins):

1. **Direct trace** — the failing step's originating tool call was made from within a skill's `Task()` prompt. Attribute to that skill.
2. **Slash-command trace** — if the increment was initiated via `/sw:<skill>`, attribute to that skill on gate failure.
3. **Evidence pattern match** — if the failure evidence text contains an exact-match 6+ word phrase from a skill's `SKILL.md`, attribute to that skill.
4. **Fallback** — emit no signal. Precision over recall; a wrong attribution is worse than none.

See `src/core/skill-attribution.ts`.

---

## Session-end nudge

When `/sw:done` closes an increment, if `sw:reflect` detected ≥1 high-confidence learning or ≥1 refinement signal for the current session, a one-line prompt is printed:

```
Detected: 2 signals for sw:architect — run sw:skill-refine sw:architect? (y/N)
```

The nudge **never auto-executes** a command; the user must explicitly run the suggested command. Disable via `.specweave/config.json`:

```json
{ "reflect": { "autoNudge": false } }
```

See [`sw:reflect`](./reflect.md) for the full nudge behavior and dashboard.

---

## ADRs

The skill-refinement loop is bounded by four red-line ADRs. They live under `.specweave/docs/internal/architecture/adr/`:

| ADR | Rule |
|-----|------|
| [ADR-0671-01](https://github.com/anton-abyzov/specweave/tree/main/.specweave/docs/internal/architecture/adr/0671-01-no-runtime-skill-mutation.md) | No runtime self-mutation. No skill file is edited during an active `/sw:do` or `/sw:done` session. Refinements are explicit user actions. |
| [ADR-0671-02](https://github.com/anton-abyzov/specweave/tree/main/.specweave/docs/internal/architecture/adr/0671-02-registry-version-immutability.md) | Registry version immutability. A skill published at version X on verified-skill.com is bit-identical for the lifetime of that version. Refinements produce a new version + new review. |
| [ADR-0671-03](https://github.com/anton-abyzov/specweave/tree/main/.specweave/docs/internal/architecture/adr/0671-03-no-self-improving-marketing.md) | No "self-improving skills" marketing copy until reproducibility guarantees and an audit log ship. |
| [ADR-0671-04](https://github.com/anton-abyzov/specweave/tree/main/.specweave/docs/internal/architecture/adr/0671-04-no-goodhart-loop.md) | No Goodhart loop. A signal emitted by gate G in session S may not validate a refinement to its source skill within the same session. |

---

## Privacy & scope

- Local-only. Signals and refinements never leave the user's machine.
- No telemetry endpoint.
- No registry-side changes.
- No cross-user aggregation.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success (diff applied, or `--dry-run` printed, or `--show-signals` rendered). |
| `1` | No signals found for the target skill. |
| `2` | Skill file not found at the resolved `--scope` path. |
| `3` | User rejected the proposed diff. |
| `4` | Haiku call failed (no refinement applied; no ledger entry). |

---

## See also

- [`sw:reflect`](./reflect.md) — session-end nudge and the `## Skill Refinement Suggestions` dashboard section.
- [`sw:skill-gen`](../skills/extensible/skill-generation.md) — the sibling skill that consumes `type: "generation"` signals to produce new skills.
- [`sw:judge-llm`](../skills/verified/secure-skill-factory-standard.md) — closure-gate judge that emits one of the three refinement signal sources.
