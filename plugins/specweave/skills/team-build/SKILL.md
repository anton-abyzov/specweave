---
description: "Preset-driven team building — spawn coordinated multi-agent teams from battle-tested presets for full-stack, review, brainstorm, testing, TDD, and migration workflows. Review and brainstorm presets work without an increment."
---

# Team Build

Spawn a coordinated team of agents from a preset configuration. Each preset defines agent roles, skill assignments, ownership boundaries, and execution order so you get a production-grade team in one command.

## Quick Start

```
sw:team-build --preset full-stack "Build checkout flow"
sw:team-build --preset review "Review auth module"
sw:team-build --preset brainstorm "Brainstorm payment architecture"
sw:team-build --preset testing "Test payment service"
sw:team-build --preset tdd "Implement rate limiter"
sw:team-build --preset migration "Migrate users to v2 schema"
```

**Note:** For the complete mode documentation and 9-domain skill mapping, see `sw:team-lead`.

## How It Works

1. Parse the `--preset` flag to select a team configuration
2. Determine team mode from preset (implementation vs review vs brainstorm)
3. For implementation presets (`full-stack`, `testing`, `tdd`, `migration`): read the active increment
4. For non-implementation presets (`review`, `brainstorm`): proceed without increment
5. Spawn agents with assigned roles and dependencies
6. Coordinate execution order (sequential gates or parallel fan-out)

### Preset-to-Mode Mapping

| Preset | Mode | Increment Required? | team_name prefix |
|--------|------|-------------------|-----------------|
| `full-stack` | implementation | Yes* | `impl-*` or any |
| `review` | review | **No** | `review-*` |
| `brainstorm` | brainstorm | **No** | `brainstorm-*` |
| `testing` | implementation | Yes* | `impl-*` or any |
| `tdd` | implementation | Yes* | `impl-*` or any |
| `migration` | implementation | Yes* | `impl-*` or any |

\* Bypassed when `SPECWEAVE_NO_INCREMENT=1` is set (e.g. `specweave team --no-increment`). In free-form mode, agents work from natural language descriptions without spec.md.

**CRITICAL**: `review` and `brainstorm` presets MUST use their mode-prefixed team_name to bypass the spec-first guard.

---

## Presets

### 1. `full-stack` — Contract-First Full-Stack Development

**Agents**: 3
**Execution order**: Sequential gate then parallel fan-out

Build features end-to-end with a shared-types-first contract approach. Agent 1 establishes the contract (types, shared utilities, interfaces) before backend and frontend agents work in parallel against that contract.

#### Agent Composition

| # | Role | Skill(s) | Owns | Responsibility |
|---|------|----------|------|----------------|
| 1 | Shared/Types | `sw:architect` | `src/types/`, `src/utils/`, `src/shared/` | Define TypeScript interfaces, shared validators, utility functions, and API contracts |
| 2 | Backend | `sw:architect` + `infra:devops` | `src/api/`, `src/services/` | Implement API endpoints, service layer, database queries, and infrastructure config |
| 3 | Frontend | `sw:architect` | `src/components/`, `src/pages/` | Build UI components, pages, state management, and client-side logic |

#### Execution Chain

```
Agent 1 (Shared/Types)
    |
    v
   GATE — types and contracts must compile
    |
    +-------+-------+
    |               |
    v               v
Agent 2          Agent 3
(Backend)        (Frontend)
    |               |
    v               v
  sw:grill       sw:grill
```

**Why contract-first**: Backend and frontend agents import from `src/types/` and `src/shared/`. By resolving the contract first, both downstream agents work against stable interfaces — no integration surprises.

#### Example

```
sw:team-build --preset full-stack "Build user profile page with avatar upload"
```

This spawns:
- **Shared/Types** agent defines `UserProfile`, `AvatarUploadRequest`, `AvatarUploadResponse` types
- **Backend** agent implements `/api/users/:id/profile` and `/api/users/:id/avatar` endpoints
- **Frontend** agent builds `<ProfilePage>`, `<AvatarUploader>` components consuming those types

---

### 2. `review` — Parallel Multi-Perspective Code Review

**Agents**: 3
**Execution order**: All parallel (independent, no dependencies)
**Mode**: review (NO increment required)
**team_name**: MUST use `review-*` prefix (e.g., `review-auth-module`)

Three specialized reviewers examine the codebase simultaneously from different angles. Each agent produces findings independently — no agent blocks another. Uses agent templates from `agents/reviewer-*.md`.

#### Agent Composition

| # | Role | Agent Template | Focus | Responsibility |
|---|------|---------------|-------|----------------|
| 1 | Security Reviewer | `agents/reviewer-security.md` | All files (read-only) | Vulnerabilities, injection, auth flaws, secrets, OWASP Top 10 |
| 2 | Logic Reviewer | `agents/reviewer-logic.md` | All files (read-only) | Correctness, edge cases, error handling, race conditions, logic bugs |
| 3 | Performance Reviewer | `agents/reviewer-performance.md` | All files (read-only) | N+1 queries, memory leaks, algorithmic complexity, scalability |

#### Execution Chain

```
+-------------------+-------------------+-------------------+
|                   |                   |                   |
v                   v                   v                   |
Agent 1             Agent 2             Agent 3             |
(Security)          (Logic)             (Performance)       |
|                   |                   |                   |
v                   v                   v                   |
REVIEW_COMPLETE     REVIEW_COMPLETE     REVIEW_COMPLETE     |
+-------------------+-------------------+-------------------+
                    |
                    v
            Merged review summary
            (Must Fix / Should Fix / Consider)
```

**All agents run in parallel.** Each uses its agent template and signals `REVIEW_COMPLETE:`. Team-lead merges, deduplicates, and prioritizes by severity.

#### Example

```
sw:team-build --preset review "Review auth module before release"
sw:team-build --preset review "Review PR #63"
```

This spawns three parallel reviewers:
- **Security** reviewer checks for token leakage, CSRF, injection, and insecure defaults
- **Logic** reviewer verifies correctness, edge cases, and error handling
- **Performance** reviewer identifies N+1 queries, memory leaks, and scalability issues

---

### 3. `testing` — Parallel Test Suite Generation

**Agents**: 3
**Execution order**: All parallel (independent, no dependencies)

Generate comprehensive test coverage across all test levels simultaneously. Each agent focuses on a different testing layer and operates independently.

> **Note:** SpecWeave testing skills (`sw:tdd-red`, `sw:e2e`, `sw:validate`) provide the testing workflows. This preset splits responsibilities into specialized agents for parallel execution.

#### Agent Composition

| # | Role | Skill(s) | Owns | Responsibility |
|---|------|----------|------|----------------|
| 1 | Unit | `sw:tdd-red` | `tests/unit/` | Write unit tests for individual functions, classes, and modules with proper mocking |
| 2 | E2E | `sw:e2e` | `tests/e2e/` | Write end-to-end tests for user flows, API sequences, and cross-service interactions |
| 3 | Coverage | `sw:validate` | `tests/` (analysis scope) | Analyze coverage gaps, generate missing test cases, ensure threshold compliance |

#### Execution Chain

```
+---------------+---------------+---------------+
|               |               |               |
v               v               v               |
Agent 1         Agent 2         Agent 3         |
(Unit)          (E2E)           (Coverage)      |
|               |               |               |
v               v               v               |
unit tests      e2e tests       coverage report |
+---------------+---------------+---------------+
                |
                v
        All tests pass + coverage met
```

**All agents run in parallel.** Unit and E2E agents write tests while the Coverage agent analyzes gaps and generates supplementary tests for uncovered paths.

#### Example

```
sw:team-build --preset testing "Test payment service end to end"
```

This spawns:
- **Unit** agent writes tests for `PaymentService`, `InvoiceCalculator`, `TaxResolver`
- **E2E** agent writes flow tests: checkout -> payment -> confirmation -> receipt
- **Coverage** agent identifies untested edge cases and generates additional tests

---

### 4. `tdd` — Strict Sequential TDD Cycle

**Agents**: 3
**Execution order**: Strict sequential (Agent 1 -> Agent 2 -> Agent 3)

Enforce the RED-GREEN-REFACTOR discipline with dedicated agents for each phase. Each agent must complete before the next begins — no shortcuts, no phase skipping.

#### Agent Composition

| # | Role | Skill(s) | Owns | Responsibility |
|---|------|----------|------|----------------|
| 1 | Red | `sw:tdd-red` | `tests/` | Write failing tests that define the expected behavior. Tests MUST fail before proceeding. |
| 2 | Green | `sw:tdd-green` | `src/` | Write the minimal implementation to make all failing tests pass. No extra features. |
| 3 | Refactor | `sw:tdd-refactor` | `src/`, `tests/` | Improve code quality, extract abstractions, reduce duplication — all tests must stay green. |

#### Execution Chain

```
Agent 1 (Red)
    |
    v
   GATE — tests must exist AND fail
    |
    v
Agent 2 (Green)
    |
    v
   GATE — all tests must pass
    |
    v
Agent 3 (Refactor)
    |
    v
   GATE — all tests still pass + sw:grill
```

**Strict sequential execution.** Agent 2 cannot start until Agent 1's tests are verified failing. Agent 3 cannot start until Agent 2's implementation passes all tests. This enforces true TDD discipline.

#### TDD Integration

When `testing.defaultTestMode: "TDD"` is set in `.specweave/config.json`, this preset automatically enables strict enforcement (`testing.tddEnforcement: "strict"`). Tasks in `tasks.md` are tagged with `[RED]`, `[GREEN]`, `[REFACTOR]` phase markers.

#### Example

```
sw:team-build --preset tdd "Implement rate limiter with sliding window"
```

This spawns sequentially:
- **Red** agent writes tests: `rateLimiter.allows(100, '1m')`, `rateLimiter.rejects(101, '1m')`, sliding window decay tests
- **Green** agent implements `RateLimiter` class with minimal sliding window logic to pass
- **Refactor** agent extracts `SlidingWindow` abstraction, adds TimeProvider injection, cleans up

---

### 5. `migration` — Contract-First Data Migration

**Agents**: 3
**Execution order**: Sequential gate then parallel fan-out

Migrate data schemas safely with a schema-first approach. The schema agent defines the new structure and writes migration scripts before backend and frontend agents adapt to the changes in parallel.

#### Agent Composition

| # | Role | Skill(s) | Owns | Responsibility |
|---|------|----------|------|----------------|
| 1 | Schema | `sw:architect` | `src/types/`, `migrations/`, `prisma/`, `drizzle/` | Define new schema, write migration scripts, update type definitions, ensure backward compatibility |
| 2 | Backend | `sw:architect` | `src/api/`, `src/services/` | Update API endpoints, service logic, queries, and serializers to work with new schema |
| 3 | Frontend | `sw:architect` | `src/components/`, `src/pages/` | Update UI components, forms, and state to reflect schema changes |

#### Execution Chain

```
Agent 1 (Schema)
    |
    v
   GATE — migration runs, types compile, rollback tested
    |
    +-------+-------+
    |               |
    v               v
Agent 2          Agent 3
(Backend)        (Frontend)
    |               |
    v               v
  sw:grill       sw:grill
```

**Schema-first ensures safety.** The migration and new types must be validated before downstream agents modify application code. Both backend and frontend work against the finalized schema in parallel.

#### Example

```
sw:team-build --preset migration "Migrate users to v2 schema with address normalization"
```

This spawns:
- **Schema** agent creates `migrations/20240315_users_v2.sql`, updates `UserV2` type, writes rollback
- **Backend** agent updates `/api/users` endpoints to read/write `UserV2`, adds address normalization service
- **Frontend** agent updates `<UserForm>`, `<AddressInput>` components to use new address fields

---

### 6. `brainstorm` — Multi-Perspective Ideation

**Agents**: 3
**Execution order**: All parallel (independent, no dependencies)
**Mode**: brainstorm (NO increment required)
**team_name**: MUST use `brainstorm-*` prefix (e.g., `brainstorm-arch-decision`)

Three perspective agents explore a question simultaneously from different angles. Uses agent templates from `agents/brainstorm-*.md`.

#### Agent Composition

| # | Role | Agent Template | Perspective | Responsibility |
|---|------|---------------|-------------|----------------|
| 1 | Advocate | `agents/brainstorm-advocate.md` | Innovation | Champions the most ambitious approach, pushes boundaries |
| 2 | Critic | `agents/brainstorm-critic.md` | Risk | Devil's advocate — finds failure modes, hidden costs, red lines |
| 3 | Pragmatist | `agents/brainstorm-pragmatist.md` | Feasibility | Practical realist — timelines, team skills, maintenance burden |

#### Execution Chain

```
+-------------------+-------------------+-------------------+
|                   |                   |                   |
v                   v                   v                   |
Agent 1             Agent 2             Agent 3             |
(Advocate)          (Critic)            (Pragmatist)        |
|                   |                   |                   |
v                   v                   v                   |
PERSPECTIVE_COMPLETE PERSPECTIVE_COMPLETE PERSPECTIVE_COMPLETE|
+-------------------+-------------------+-------------------+
                    |
                    v
            Decision matrix + recommendation
            → sw:increment if proceeding
```

**All agents run in parallel.** Each signals `PERSPECTIVE_COMPLETE:`. Team-lead synthesizes into a decision matrix with scored options.

#### Example

```
sw:team-build --preset brainstorm "Microservices vs monolith for our growing app"
```

This spawns:
- **Advocate** champions microservices — independent scaling, team autonomy, polyglot support
- **Critic** warns about distributed complexity, network latency, operational overhead
- **Pragmatist** evaluates team size, current traffic, migration cost, and timeline

---

## Flags

| Flag | Required | Description |
|------|----------|-------------|
| `--preset` | Yes | One of: `full-stack`, `review`, `brainstorm`, `testing`, `tdd`, `migration` |
| `--increment` | No | Increment ID to operate on (defaults to active increment; ignored for review/brainstorm) |
| `--dry-run` | No | Show what agents would be spawned without actually spawning them |
| `--max-agents` | No | Override max concurrent agents (default: 3) |

## Execution Order Summary

| Preset | Order | Pattern | Increment? |
|--------|-------|---------|-----------|
| `full-stack` | Sequential gate + parallel | Agent 1 first, then [Agent 2 + Agent 3] in parallel | Yes |
| `review` | All parallel | [Agent 1 + Agent 2 + Agent 3] simultaneously | **No** |
| `brainstorm` | All parallel | [Agent 1 + Agent 2 + Agent 3] simultaneously | **No** |
| `testing` | All parallel | [Agent 1 + Agent 2 + Agent 3] simultaneously | Yes |
| `tdd` | Strict sequential | Agent 1 -> Agent 2 -> Agent 3 (no parallelism) | Yes |
| `migration` | Sequential gate + parallel | Agent 1 first, then [Agent 2 + Agent 3] in parallel | Yes |

## SpecWeave Workflow Integration

### Implementation Presets (full-stack, testing, tdd, migration)

Each spawned agent integrates with the standard SpecWeave workflow:

1. **Increment context** — agents read `spec.md` and `tasks.md` from the active increment
2. **Task execution** — agents use `sw:do` or `sw:auto` to work through their assigned tasks
3. **Quality gates** — agents run `sw:grill` before marking tasks complete
4. **Progress tracking** — task status updates flow back to `tasks.md` with AC linkage
5. **Ownership boundaries** — agents only modify files within their assigned directories
6. **Conflict prevention** — ownership scopes are non-overlapping to prevent merge conflicts

### Non-Implementation Presets (review, brainstorm)

These presets operate without increments:

1. **Read-only analysis** — agents examine code but do not modify it
2. **Independent reports** — each agent produces findings independently
3. **Team-lead synthesis** — team-lead merges and deduplicates agent outputs
4. **No closure needed** — no `sw:done` or `sw:grill` required
5. **Follow-up bridge** — if actionable items found, suggest `sw:increment` to formalize

### Organization Discovery (resolve BEFORE spawning agents)

Resolve the `{ORG}` placeholder from `.specweave/config.json` (in priority order):
1. `repository.organization` field
2. `sync.profiles[*].config.owner` (GitHub) or `.config.organization` (ADO)
3. Parse from `umbrella.childRepos[0].path` (strip `repositories/` prefix, take first segment)
4. Check filesystem: `ls repositories/*/` and use the org folder name
5. If all fail, ask the user. **NEVER use .env files for org.**

### Multi-Repo Increment Placement

**In umbrella projects with a `repositories/` folder:**
- Each agent MUST create its increment in its assigned repo's `.specweave/increments/`
- The umbrella root `.specweave/` is for config ONLY, not for agent increments
- Run `specweave init` in each repo if `.specweave/` doesn't exist
- Agent working directory = `repositories/{ORG}/{repo-name}/` (replace `{ORG}` with discovered value)

### Agent Lifecycle

```
Spawn → Load increment context → Claim tasks → sw:do or sw:auto → sw:grill → Report completion
```

### Error Handling

- If a gate agent (Agent 1 in `full-stack`, `migration`, or `tdd`) fails, downstream agents are NOT spawned
- If a parallel agent fails, other parallel agents continue — failures are collected and reported
- Agents retry transient failures (build errors, flaky tests) up to 2 times before reporting failure
- On failure, the agent produces a diagnostic report explaining what went wrong and suggested fixes

#### Invalid Preset Name

If user provides an unknown preset name:

```
Error: Unknown preset "xyz". Available presets: full-stack, review, brainstorm, testing, tdd, migration.
Use sw:team-build --help to see preset details.
```

## Custom Presets

To define custom presets, add a `teamPresets` section to `.specweave/config.json`:

```json
{
  "teamPresets": {
    "my-preset": {
      "agents": [
        {
          "role": "Analyst",
          "skills": ["sw:architect"],
          "owns": ["src/analysis/"],
          "dependsOn": []
        },
        {
          "role": "Implementer",
          "skills": ["sw:architect"],
          "owns": ["src/core/"],
          "dependsOn": ["Analyst"]
        }
      ]
    }
  }
}
```

Custom presets follow the same execution rules: agents with no `dependsOn` run in parallel; agents with dependencies wait for their predecessors to complete.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Agent fails to spawn | Check that required skills are installed: `claude plugin list` |
| Gate agent blocks forever | Kill the stuck agent and check its output for errors |
| Ownership conflict | Ensure no two agents in the same preset share directory ownership |
| TDD gate rejects Green | Agent 1 (Red) tests must genuinely fail — check for accidentally passing tests |
| Agents out of sync | Run `sw:progress` to see per-agent task status and identify blockers |

## Resources

- [Official Documentation](https://verified-skill.com/docs/reference/skills#team-build)
