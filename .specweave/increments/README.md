# Product Increments

Source of truth for all SpecWeave product increments (user stories, tasks, and plans).

## Structure

Each increment follows this structure:

```
###-increment-name/
├── spec.md                  # Summary (WHAT + WHY) - references living strategy docs
├── plan.md                  # Summary (HOW) - references living architecture docs + ADRs
├── tasks.md                 # Implementation steps (generated from plan.md)
├── tests.md                 # Test strategy - references spec.md acceptance criteria
├── logs/                    # Increment-specific logs
├── scripts/                 # Increment-specific scripts
└── reports/                 # Increment-specific reports
```

**Key principles**:
- **spec.md is a SUMMARY** (< 250 lines) - References `.specweave/docs/internal/strategy/{module}/` (living docs)
- **plan.md is a SUMMARY** (< 500 lines) - References `.specweave/docs/internal/architecture/` (living docs + ADRs)
- **Living docs are source of truth** - Increments reference them, don't duplicate
- **Technology-agnostic requirements** - spec.md has NO tech details (WHAT/WHY only)
- **ADRs for all decisions** - Architect creates ADRs in `.specweave/docs/internal/architecture/adr/`

## Living Documentation Structure

**Complete requirements and architecture live OUTSIDE increments**:

```
.specweave/docs/
├── internal/
│   ├── strategy/                    # ← PM Agent creates/updates
│   │   └── {module}/                # e.g., crypto-trading, authentication
│   │       ├── overview.md          # Product vision, problem statement, users
│   │       ├── requirements.md      # Complete FR/NFR (technology-agnostic)
│   │       ├── user-stories.md      # All user stories (US1, US2, US3, ...)
│   │       └── success-criteria.md  # KPIs, business metrics
│   │
│   └── architecture/                # ← Architect Agent creates/updates
│       ├── system-design.md         # Overall system architecture (C4 Level 1-2)
│       ├── adr/                     # Architecture Decision Records
│       │   ├── ####-websocket-vs-polling.md
│       │   ├── ####-database-choice.md
│       │   └── ####-deployment-platform.md
│       ├── diagrams/                # Mermaid C4 diagrams
│       │   └── {module}/
│       │       ├── system-context.mmd    # C4 Level 1
│       │       └── system-container.mmd  # C4 Level 2
│       └── data-models/             # ERDs, database schemas
│           └── {module}-schema.sql
```

**Why this structure?**
- ✅ Living documentation grows with project (not scattered across increments)
- ✅ Single source of truth (one place for requirements, one for architecture)
- ✅ Increments stay concise (summaries with references)
- ✅ Future increments reuse existing docs (no duplication)
- ✅ Easy to see complete system (all architecture in one place)

## How spec.md and plan.md Work (Summaries + References)

### spec.md - Product Summary (WHAT + WHY)

**Purpose**: Quick reference to business requirements that links to complete strategy docs

**Structure**:
```markdown
---
increment: 0001-feature-name
title: "Feature Title"
priority: P1
status: planned
---

# Feature: [Name]

## Overview

See complete product vision: [Overview](../../docs/internal/strategy/{module}/overview.md)

Quick summary: [1-2 paragraphs]

## Requirements (Summary)

**Complete requirements**: [requirements.md](../../docs/internal/strategy/{module}/requirements.md)

Key requirements:
- FR-001: Real-time data updates
- FR-002: Multi-source support
- NFR-001: Performance < 500ms latency

## User Stories (Summary)

**Complete user stories**: [user-stories.md](../../docs/internal/strategy/{module}/user-stories.md)

- US1: Receive real-time updates
- US2: Support multiple data sources
- US3: Persist data reliably

(See linked doc for full acceptance criteria)

## Success Criteria

**Complete metrics**: [success-criteria.md](../../docs/internal/strategy/{module}/success-criteria.md)

Key metrics: [Summary only]
```

**Size limit**: < 250 lines (summary only, detailed docs live in `.specweave/docs/internal/strategy/`)

---

### plan.md - Technical Summary (HOW)

**Purpose**: Implementation guide that links to complete architecture docs and ADRs

**Structure**:
```markdown
---
increment: 0001-feature-name
architecture_docs:
  - ../../docs/internal/architecture/system-design.md
  - ../../docs/internal/architecture/adr/0001-websocket-vs-polling.md
  - ../../docs/internal/architecture/adr/0002-database-choice.md
---

# Implementation Plan: [Feature Name]

## Architecture Overview

**Complete architecture**: [System Design](../../docs/internal/architecture/system-design.md)

Quick summary: [1-2 paragraphs]

## Key Technical Decisions

- [ADR-0001: WebSocket Architecture](../../docs/internal/architecture/adr/0001-websocket-vs-polling.md)
  - Decision: Use WebSocket for real-time data
  - Rationale: Low latency, efficient, exchange-supported

- [ADR-0002: Database Choice](../../docs/internal/architecture/adr/0002-database-choice.md)
  - Decision: PostgreSQL with TimescaleDB
  - Rationale: Time-series optimization, ACID compliance

- [ADR-0003: Deployment Platform](../../docs/internal/architecture/adr/0003-railway-deployment.md)
  - Decision: Railway
  - Rationale: Budget-friendly, WebSocket support, managed PostgreSQL

## Technology Stack Summary

- Language: TypeScript 5.x (see ADR-0004)
- Framework: Node.js 20 LTS
- Database: PostgreSQL 15 with TimescaleDB (see ADR-0002)
- Deployment: Railway (see ADR-0003)

## Implementation Phases

Phase 1: WebSocket Connection Manager
Phase 2: Data Normalization Layer
Phase 3: Database Persistence
Phase 4: Health Monitoring

(See system-design.md for complete architecture)
```

**Size limit**: < 500 lines (summary only, detailed architecture lives in `.specweave/docs/internal/architecture/`)

---

### Why This Approach?

**Benefits**:
- ✅ **Single source of truth**: Complete requirements in strategy docs, complete architecture in architecture docs
- ✅ **No duplication**: Increments reference, don't copy
- ✅ **Living documentation**: Docs grow with project, not scattered across increments
- ✅ **Reusability**: Future increments reference same architecture docs
- ✅ **Concise increments**: Easy to scan (< 250 lines spec, < 500 lines plan)

**Example workflow**:
1. PM Agent creates `.specweave/docs/internal/strategy/crypto-trading/requirements.md` (complete, technology-agnostic)
2. PM Agent creates `.specweave/increments/0001-*/spec.md` (summary with links)
3. Architect Agent reads strategy docs
4. Architect Agent creates `.specweave/docs/internal/architecture/adr/0001-websocket-vs-polling.md` (ADR)
5. Architect Agent creates `.specweave/increments/0001-*/plan.md` (summary with links to ADRs)
6. Future increments reference same strategy/architecture docs (no rewriting)

---

## Types of Increments

Increments can represent different types of work. All types follow the same structure (spec.md + plan.md + tasks.md) but differ in their purpose and scope.

### Feature Increments (Primary)
- **Purpose**: New capabilities and functionality
- **Content**: User stories with acceptance criteria
- **Focus**: Adding value to the product
- **Example**: "Add payment processing", "User authentication system"

### Bug Fix Increments
Bug fixes ARE product increments when they restore or improve product value:

- **Critical/Security bugs** → Dedicated increment (P1)
  - Security vulnerabilities
  - Data integrity issues
  - User-blocking failures
  - Example: `005-payment-security-fix`

- **Major bugs** → Dedicated increment (P1/P2)
  - Significant functionality broken
  - Performance degradation
  - User experience impact
  - Example: `008-checkout-flow-restoration`

- **Minor bugs** → Tasks within current increment
  - Small UI glitches discovered during implementation
  - Edge case handling
  - Polish and refinements
  - These are validation phase tasks, not separate increments

**Bug fix spec.md includes**:
- Description of incorrect behavior (current state)
- Expected correct behavior (desired state)
- Acceptance tests proving the fix works
- Regression tests to prevent recurrence

### Maintenance Increments
- **Purpose**: Improve code quality without changing functionality
- **Content**: Technical debt reduction, refactoring, performance optimization
- **Focus**: Developer experience, system health, scalability
- **Example**: "Refactor authentication layer", "Optimize database queries"

### Documentation Increments
- **Purpose**: Improve project documentation
- **Content**: User guides, API docs, architecture diagrams
- **Focus**: Knowledge transfer, onboarding, clarity
- **Example**: "Complete API documentation", "Migration guide from v1 to v2"

**All increment types use the same structure** but emphasize different aspects in their spec.md and tasks.md files.

## Creating an Increment

### Using CLI (Recommended)
```bash
specweave increment create "Add payment processing"
```

This will:
1. Auto-number the increment (e.g., `003-payment-processing`)
2. Create directory structure
3. Generate spec.md template
4. Create tasks.md template

### Manual Creation
1. Find highest number in `.specweave/increments/` directory
2. Increment by 1
3. Create directory: `.specweave/increments/####-short-name/`
4. Create `spec.md` with frontmatter:
```yaml
---
increment: ####-short-name
title: "Increment Title"
type: feature|bug-fix|maintenance|documentation  # Optional: categorize increment
priority: P1/P2/P3
status: planned/in-progress/completed
created: YYYY-MM-DD
dependencies:
  - 001-skills-framework  # Optional: list dependencies
structure: user-stories
---
```
5. Create `tasks.md` with implementation details

## Increment Lifecycle (5 Stages)

**Status progression**:
```
backlog → planned → in-progress → completed → closed
```

### 1. Backlog (status: backlog)
- **Location**: `.specweave/increments/_backlog/####-name.md`
- **Purpose**: Capture ideas before full planning
- **Criteria**: Basic idea documented
- **Next**: Promote to "planned" when prioritized

### 2. Planned (status: planned)
- **Location**: `.specweave/increments/####-name/`
- **Purpose**: Ready to start, spec complete
- **Criteria**:
  - ✅ `spec.md` created with user stories
  - ✅ `tasks.md` created with implementation plan
  - ✅ Dependencies identified
  - ✅ Priority assigned (P1/P2/P3)
- **Next**: Start with `/start-increment <id>` (checks WIP limit)

### 3. In Progress (status: in-progress)
- **Purpose**: Active development underway
- **Criteria**:
  - ✅ At least 1 task started
  - ✅ WIP limit not exceeded (2-3 max for framework, 1-2 for user projects)
  - ✅ Dependencies completed
- **Activities**:
  - Follow `tasks.md` checklist
  - Mark tasks complete: `[ ]` → `[x]`
  - Add tasks as discovered: `/add-tasks <id> "description"`
  - Log progress in `logs/execution.log`
- **Next**: Complete all P1 tasks

### 4. Completed (status: completed)
- **Purpose**: All P1 tasks done, ready for review
- **Criteria**:
  - ✅ All P1 (critical) tasks completed
  - ✅ All tests passing
  - ✅ Documentation updated
  - ❌ P2/P3 tasks MAY remain (can transfer to another increment)
- **Next**: Close with `/close-increment <id>`

### 5. Closed (status: closed)
- **Purpose**: Reviewed, archived, WIP slot freed
- **Criteria**:
  - ✅ All "completed" criteria met
  - ✅ Closure report generated
  - ✅ Leftovers transferred (if any)
  - ✅ Retrospective done (optional)
- **Result**: WIP slot freed, can start new increment

## WIP (Work In Progress) Limits

**Purpose**: Prevent context-switching (20-40% productivity loss), improve focus and quality

| Project Type | WIP Limit |
|--------------|-----------|
| Framework development (SpecWeave repo) | 2-3 in progress |
| User projects (solo/small team) | 1-2 in progress |
| User projects (large team) | 3-5 in progress |

**Enforcement**:
- Cannot create or start new increment when at WIP limit
- Must close existing increment to free WIP slot
- Override with `--force` (use sparingly)

**Check WIP status**: `/list-increments --wip-only`

## Closing Increments with Leftover Transfer

**When to close** ✅:
- All P1 (critical) tasks completed
- All tests passing
- Documentation updated
- P2/P3 tasks can remain and be transferred

**Valid reasons to transfer leftovers**:
1. Time-boxed completion (e.g., 2-week sprint ended, 80% is enough)
2. Lower priority work (P2/P3 can wait)
3. Scope clarification (some tasks no longer relevant)
4. Blocked tasks (waiting on external dependencies)
5. Business pivot (priorities changed)

**Closure workflow**:
```bash
/close-increment 001

# System validates P1 completion
# Identifies leftovers (P2/P3 tasks)
# Offers transfer options:
#   A) Create new increment with leftovers
#   B) Add to existing increment
#   C) Cancel leftovers
# Generates closure report
# Updates status to "closed"
# Frees WIP slot
```

**Closure report**: Auto-generated in `reports/closure-report.md`

**Task status markers**:
- `[ ]` - Not started
- `[-]` - In progress (optional)
- `[x]` - Completed
- `[T]` - Transferred to another increment
- `[C]` - Canceled (no longer relevant)

## Priority Levels

Increments use P1/P2/P3 prioritization:

- **P1 (Critical)**: Must-have for MVP, blocking other work, foundational capabilities
- **P2 (Important)**: Enhanced functionality, high value, significant features
- **P3 (Nice-to-have)**: Polish, optimizations, future enhancements

## Dependencies

Increments can declare dependencies on other increments:

```yaml
---
increment: 002-role-based-agents
dependencies:
  - 001-skills-framework  # Must complete before this increment
---
```

**Dependency order**: Implement in numerical order unless dependencies allow parallel work

## Current Increments

**IMPORTANT**: This is the SpecWeave framework repository. It has ONE increment representing framework development:

| # | Increment | Priority | Status | Description | Dependencies |
|---|-----------|----------|--------|-------------|--------------|
| [001](./001-core-framework/) | core-framework | P1 | In Progress | Complete SpecWeave framework with 20 agents, 24 skills, context loading, routing, hooks, slash commands. All agents/skills live in `src/`. | None |

**Note**: When you USE SpecWeave in YOUR projects, you'll create many increments (authentication, payments, calendar, etc.). This directory shows how to build the framework itself.

---

## History: Restructured from Old Features Folder

**NOTE**: This `.specweave/increments/` directory is the current structure (previously called `features/`).

**Current structure** (`.specweave/increments/`):
- ✅ .specweave/increments/####-name/ with spec.md, tasks.md (+ optional strategic outputs)
- ✅ Logs/scripts/reports inside each increment folder (increment-centric)
- ✅ Strategic outputs from agents (pm-analysis.md, architecture.md, etc.)
- ✅ Context loading at project level (no per-increment manifests)

**Simplified from old structure**:
- **NO plan.md** - Tech details go in tasks.md (no redundancy)
- **NO tests.md** - Acceptance tests in spec.md, test strategy in test-strategy.md (if needed)
- **NO context-manifest.yaml** - Context loading is project-level configuration
- **NO global logs/work folders** - Everything lives in increment folders

---

## Best Practices

1. **Keep spec.md technology-agnostic** - Focus on WHAT and WHY (user value), not HOW (implementation)
2. **Put ALL technical details in tasks.md** - No separate plan.md needed
3. **Make tasks executable** - Each task should be independently achievable with clear acceptance criteria
4. **Use role-based agents** - Let PM agent define product strategy, Architect agent design system, etc.
5. **Track dependencies** - Declare dependencies to ensure proper implementation order
6. **Update status** - Keep frontmatter status current (planned → in-progress → completed)
7. **Choose the right increment type**:
   - Critical bugs deserve dedicated increments (with regression tests)
   - Minor bugs are validation tasks within current work
   - Maintenance work improves code without changing behavior
   - Group related fixes/improvements when appropriate
8. **Bug fix increments must include**:
   - Clear description of incorrect behavior
   - Regression tests to prevent recurrence
   - Validation that fix doesn't break other functionality

---

## Lifecycle Commands

**Increment management slash commands**:

| Command | Purpose | Documentation |
|---------|---------|---------------|
| `/create-increment` | Create new increment (checks WIP limit) | [create-increment.md](../../.claude/commands/create-increment.md) |
| `/start-increment` | Start planned increment (checks WIP limit) | [start-increment.md](../../.claude/commands/start-increment.md) |
| `/add-tasks` | Add tasks to existing increment | [add-tasks.md](../../.claude/commands/add-tasks.md) |
| `/close-increment` | Close with leftover transfer | [close-increment.md](../../.claude/commands/close-increment.md) |
| `/list-increments` | View all increments and WIP status | [list-increments.md](../../.claude/commands/list-increment.md) |

---

## Related Documentation

**Lifecycle Design**:
- [INCREMENT-LIFECYCLE-DESIGN.md](./001-core-framework/reports/INCREMENT-LIFECYCLE-DESIGN.md) - Complete lifecycle design document
- [CLAUDE.md](../../CLAUDE.md#increment-lifecycle-management) - Lifecycle management guide

**Project Documentation**:
- [Architecture](../docs/architecture/) - System design documents
- [Decisions](../docs/decisions/) - Architecture Decision Records (ADRs)
- [API](../docs/api/) - API reference documentation
- [Guides](../docs/guides/) - How-to guides

---

**For more information**, see:
- [CLAUDE.md](../../CLAUDE.md) - Project instructions (complete development guide)
- [CONSOLIDATION-COMPLETE.md](./001-core-framework/reports/CONSOLIDATION-COMPLETE.md) - Increment consolidation report

---

**Last Updated**: 2025-10-26
**Auto-Generated**: This README is updated when new increments are created
