# Dynamic Workflows — Team Lead Reference

Loaded on demand by §0.4 when team-lead routes work to the **Dynamic Workflow** engine, or when a
domain agent enters **Workflow Mode** (`agents/_protocol.md`). Keep this OUT of the main reasoning
loop unless a Workflow is actually being authored.

## What it is

`Workflow()` runs a **JavaScript script that HOLDS the orchestration plan in code**. A deterministic
runtime executes it in the background; intermediate results live in **script variables (OFF the
agent's context)** — only the `return` value lands back in context. It is resumable and background.

| | Agent Teams | Dynamic Workflow |
|---|---|---|
| Driver | model, turn-by-turn | the script (deterministic) |
| Domain awareness | full (specs/ACs/increments/gates) | **none** — domain-blind |
| Intermediate results | agent context | script variables |
| Scale | a handful of peers | ≤16 concurrent / ≤1000 total |
| Best for | feature work, lifecycle, sync | homogeneous fan-out, verify, research |

## Hard limits

- **≤16 concurrent** subagents (fewer on low-CPU machines), **≤1000 total** per run.
- **One nesting level only** — `workflow()` inside a leaf subagent THROWS.
- `meta` export is **required** and must be a **pure literal** (no variables/among/calls/spreads).
- **Forbidden in scripts**: `Date.now()`, `Math.random()`, argless `new Date()` (break resume).

## Primitives

| Primitive | Shape | Barrier? | Use |
|---|---|---|---|
| `agent(prompt, opts?)` | `→ Promise<string \| object>` | — | unit of work; with `schema` returns validated JSON (auto-retries on mismatch) |
| `parallel(thunks)` | `Array<() => Promise> → Promise<(T\|null)[]>` | **YES** (waits for all) | fan-out-then-reduce, judge panels. Failed thunks → `null`; `.filter(Boolean)` |
| `pipeline(items, ...stages)` | each stage `(prev, orig, idx)` | **NO** (streaming) | **default** multi-stage; item A in stage 3 while B in stage 1 |
| `phase(title)` | `→ void` | — | name a progress group |
| `log(msg)` | `→ void` | — | narrator line during the run |
| `workflow(name, args?)` | inline sub-workflow | — | one level only |
| `args` | global | — | structured input passed at launch |
| `budget` | global | — | `budget.total` (null if unset), `budget.spent()`, `budget.remaining()` |

`agent()` opts: `schema`, `label`, `phase`, `model`, `effort` (`low…max`), `isolation: "worktree"`
(safe parallel file writes), `agentType` (e.g. `'general-purpose'`).

**`parallel` vs `pipeline`**: barrier only when stage N genuinely needs ALL of stage N-1 (dedup,
early-exit on zero, cross-item comparison). Otherwise `pipeline` — no wasted wall-clock.

## Reusable quality patterns

| Pattern | When |
|---|---|
| fan-out → reduce → synthesize | the base skeleton — gather then compile |
| adversarial verify | N skeptics prompted to REFUTE a finding; keep only if a majority survive |
| perspective-diverse verify | a distinct lens per verifier (correctness / security / perf / repro) |
| judge panel / tournament | N attempts from different angles, scored by judges, synthesize the winner |
| loop-until-dry | keep spawning finders until K rounds surface nothing new (dedupe vs a `seen` set) |
| multi-modal sweep | parallel agents each searching a different way (by-container, by-content, by-time) |
| completeness critic | a final agent asking "what's missing?" → next round of work |
| deep-research pipeline | scope → fan-out searches → fetch → vote per claim → synthesize cited report |

## Per-mode → engine + pattern (team-lead modes)

| Mode | Engine | Pattern |
|---|---|---|
| brainstorm | Agent Teams (tmux steering) | perspective-diverse verify — advocate / critic / pragmatist fan out → synthesize |
| plan | Agent Teams (PM + Architect) | fan-out then reduce — PM specs while Architect explores (~30s overlap) → one plan |
| implement | Agent Teams outer; inner Workflow ×1 for a ≥25 same-shape domain batch | contract-first phasing; opt-in fan-out inside a batch-shaped domain |
| review | `sw:code-reviewer` (unchanged) | adversarial verify / completeness critic — N reviewers + self-critique |
| research | Dynamic Workflow (pipeline) when multi-source; Agent Teams for 2-3 steerable researchers | deep-research pipeline, results off-context |
| test | Dynamic Workflow when many independent same-shape tests; Agent Teams when layers have setup deps | multi-modal sweep / loop-until-dry |

## Nesting law (boxed)

```
LEGAL:    team-lead (orchestrator, NOT a Workflow) → Task member → Workflow ×1 → leaves (none)
LEGAL:    top-level Workflow (team-lead fires it directly for pure batch work)
ILLEGAL:  Workflow leaf → Workflow()        (throws)
ILLEGAL:  team-lead rewritten AS a Workflow (members become leaves, lose the right to fan out)
```

For pure batch-class work prefer ONE top-level Workflow with `parallel()` over the items (one
budget, one scheduler) instead of N domain agents each launching their own.

## Config schema — `quality.workflows`

Absent or `enabled:false` ⇒ classic Agent-Teams behavior (default-off, non-destructive).

```json
{
  "quality": {
    "workflows": {
      "enabled": false,
      "maxConcurrentWorkflows": 1,
      "perRunTokenBudget": 250000,
      "maxSubagentsPerWorkflow": 16,
      "batchShapeThreshold": 25,
      "agentBorrow": { "enabled": false },
      "stuckDetection": {
        "workflowNoProgressMin": 20,
        "workflowTotalStuckMin": 60
      },
      "telemetry": { "logBatchRouteActivations": true }
    }
  }
}
```

| Key | Default | Purpose |
|---|---|---|
| `enabled` | `false` | master switch; false ⇒ never auto-route to Workflow, never honor the borrow |
| `maxConcurrentWorkflows` | `1` | caps N-fold token stacking when multiple domains qualify |
| `perRunTokenBudget` | `250000` | ceiling per Workflow run; a projected batch over this must split or go sequential |
| `maxSubagentsPerWorkflow` | `16` | per-Workflow concurrency (runtime hard max is 16) |
| `batchShapeThreshold` | `25` | min same-shape independent tasks before a domain may borrow Workflow |
| `agentBorrow.enabled` | `false` | opt-in inner borrow (Agent-Teams member → Workflow ×1) |
| `stuckDetection.workflow*` | 20 / 60 min | extended windows while an agent is `state=workflow-delegating` (§8b) |
| `telemetry.logBatchRouteActivations` | `true` | log batch-route firings so keep-vs-reposition is re-decidable on real data |

## Triggers

`ultracode` keyword or `/effort ultracode` ⇒ xhigh + auto workflow orchestration. Otherwise team-lead
§0.4 auto-routes by work shape — it **never** requires the user to say "use a workflow".

## When NOT to use a Workflow

Dependency-laden feature work (sequential cross-domain deps defeat fan-out), <25 tasks, or
single-domain work — use Agent Teams or inline instead. Workflow fan-out buys ~zero speedup on the
median increment (10-20 tasks, 2-3 domains, frontend ⇐ OpenAPI ⇐ schema).

## Ship order (why default-off matters)

The enhancement is only non-destructive because every new path is gated on `quality.workflows`,
which is **absent by default**. The intended activation sequence, if/when enabled in a config:

1. Set `quality.workflows.enabled` + budget guards (`perRunTokenBudget`, `maxConcurrentWorkflows`).
2. Confirm §8b Workflow-Aware Stuck Detection is live (it ships with this skill).
3. Only then set `agentBorrow.enabled` (the inner borrow) — never before guards 1–2.
4. Route pure batch-class work (migrations, audits) to a SINGLE top-level Workflow, not N nested.
5. Keep `telemetry.logBatchRouteActivations` on so the keep-vs-reposition question is re-decidable
   on real data (analytics is currently empty — this decision rests on architecture, not usage).

> Deferred to a separate telemetry-backed increment (NOT this change): consolidating the `team-*`
> sibling skills (`team-build` already deprecated, `team-merge` clones the closure phase) and
> retiring generic modes to Workflow patterns. Correct in direction, but non-additive and unsupported
> by telemetry today.
