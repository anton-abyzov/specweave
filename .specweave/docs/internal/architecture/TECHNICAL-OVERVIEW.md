# SpecWeave Technical Overview

**Last Updated**: 2026-01-08
**Version**: 1.0.109
**Audience**: Contributors, Technical Staff, Architects

---

## Executive Summary

SpecWeave is an enterprise-grade, spec-driven development framework built on TypeScript with **215K+ lines** of core code and **25+ specialized plugins**. It provides AI-native workflow automation, intelligent multi-agent planning, multilingual support (9 languages), and permanent living documentation with temporary increments for agile development.

**Key Capabilities**:
- Spec-first development with automatic task generation
- Multi-agent planning system (PM → Architect → Tech Lead)
- Autonomous execution mode with test-driven loops
- Bidirectional sync with GitHub, JIRA, and Azure DevOps
- Event-driven hook system with health checking
- Progressive plugin loading (99.98% token savings)
- Living documentation that evolves with your codebase

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Key Design Patterns](#key-design-patterns)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Plugin System](#plugin-system)
6. [External Integrations](#external-integrations)
7. [Performance & Scalability](#performance--scalability)
8. [Security Model](#security-model)
9. [Development Guide](#development-guide)
10. [References](#references)

---

## Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                   SpecWeave Ecosystem                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐        │
│  │ Developer│───▶│SpecWeave │◀───│Claude AI │        │
│  │          │    │   CLI    │    │          │        │
│  └──────────┘    └─────┬────┘    └──────────┘        │
│                        │                               │
│         ┌──────────────┼──────────────┐               │
│         ▼              ▼              ▼               │
│    ┌────────┐    ┌────────┐    ┌────────┐           │
│    │ GitHub │    │  JIRA  │    │  ADO   │           │
│    └────────┘    └────────┘    └────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

See detailed diagrams: [diagrams/system-context.mmd](diagrams/system-context.mmd)

### High-Level Container View

SpecWeave consists of 7 major containers:

| Container | Technology | Purpose |
|-----------|------------|---------|
| **CLI** | Commander.js | User interface and command routing |
| **Core Framework** | TypeScript | Increment management, specs, tasks |
| **Plugin System** | Dynamic loading | Extensibility via skills, agents, commands |
| **Living Docs Builder** | Markdown + AI | Enterprise documentation generation |
| **Sync Engine** | REST APIs | Bidirectional sync with external tools |
| **Hook System** | Child processes | Event-driven automation |
| **Multi-Agent System** | LLM orchestration | Specialized planning agents |

See detailed diagrams: [diagrams/system-container.mmd](diagrams/system-container.mmd)

---

## Core Components

### 1. Increment Management System

**Location**: `src/core/increment/`

**Purpose**: Manages temporary work units (increments) with explicit lifecycle, status transitions, and discipline enforcement.

**Key Classes**:
- `MetadataManager` - CRUD operations for metadata.json
- `ActiveIncrementManager` - Fast cache lookup for active increments
- `IncrementArchiver` - Archives completed increments
- `StatusAutoTransition` - Auto-transitions based on task completion
- `CompletionValidator` - Validates acceptance criteria before closure
- `DisciplineChecker` - Enforces folder structure rules

**Increment Types & WIP Limits**:

| Type | WIP Limit | Purpose |
|------|-----------|---------|
| HOTFIX | Unlimited | Critical production fixes |
| FEATURE | Max 2 | New functionality |
| BUG | Unlimited | Bug fixes |
| CHANGE_REQUEST | Max 2 | Requirement changes |
| REFACTOR | Max 1 | Code quality improvements |
| EXPERIMENT | Unlimited | R&D, auto-abandon after 14 days |

**Status Lifecycle** (State Machine):

```
PLANNING → ACTIVE → READY_FOR_REVIEW → COMPLETED
    ↓         ↓            ↓
BACKLOG   PAUSED      ABANDONED
```

**Key Rules**:
- WIP limit = Count of (ACTIVE + PAUSED + READY_FOR_REVIEW)
- MUST pass through READY_FOR_REVIEW before COMPLETED (prevents auto-completion bugs)
- User approval required for COMPLETED status (via `/sw:done`)
- Auto-transition: When all tasks [x], ACTIVE → READY_FOR_REVIEW
- Staleness detection: Warn after 30 days of inactivity

See diagrams: [diagrams/state/increment-lifecycle.mmd](diagrams/state/increment-lifecycle.mmd)

### 2. Specification & Task Model

**Location**: `src/core/specs/`, `src/core/increment/`

**File Structure**:
```
.specweave/increments/0001-feature/
├── metadata.json        # Status, timestamps, sync targets
├── spec.md             # User stories (US-XXX) + Acceptance Criteria (AC-*)
├── plan.md             # Architecture & implementation plan
├── tasks.md            # Granular tasks (T-XXX) with BDD tests
├── reports/            # Validation reports, session summaries
├── logs/               # Execution logs (dated folders)
└── scripts/            # Helper scripts
```

**Spec Format** (spec.md):
```yaml
---
increment: 0001-feature-name
title: "Feature Title"
---

## Feature Overview
[Description of the feature]

## User Stories

### US-001: User Story Title
**Project**: my-project
**As a** user, **I want** X **so that** Y

#### Acceptance Criteria
- [ ] **AC-US1-01**: Criterion 1
- [ ] **AC-US1-02**: Criterion 2
```

**Task Format** (tasks.md):
```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending

#### Acceptance
- [ ] **AC-US1-01**: Criterion 1 (from spec.md)
- [ ] **AC-US1-02**: Criterion 2 (from spec.md)

**Test**: Given [context] → When [action] → Then [outcome]

#### Notes
[Implementation notes]
```

**Auto-Sync Rules**:
1. When task marked `[x]` in tasks.md
2. ALL acceptance checkboxes in that task → `[x]`
3. Corresponding ACs in spec.md → `[x]`
4. If ALL tasks complete → Auto-transition to READY_FOR_REVIEW

**Key Components**:
- `SpecParser` - Extracts user stories, ACs, tasks from markdown
- `SpecDistributor` - Distributes specs across multi-project folders
- `CompletionPropagator` - Propagates AC completion bidirectionally
- `TaskStateManager` - Manages task completion state
- `ACStatusManager` - Synchronizes AC checkboxes

See diagrams: [diagrams/flows/task-completion-flow.mmd](diagrams/flows/task-completion-flow.mmd)

### 3. Plugin System Architecture

**Location**: `plugins/`, `src/core/plugin/`

**Plugin Structure**:
```
plugin-name/
├── .claude-plugin/
│   └── plugin.json              # Manifest (Claude's official format)
├── lib/                          # Compiled JavaScript
├── scripts/                      # Utility scripts
├── skills/                       # Auto-activating capabilities
│   └── skill-name/
│       ├── SKILL.md             # Trigger patterns
│       └── skill.ts             # Implementation
├── agents/                       # Specialized roles (isolated context)
│   └── agent-name/
│       ├── AGENT.md             # System prompt
│       └── agent.ts             # Configuration
├── commands/                     # Slash commands (CLI)
│   └── command.ts
├── hooks/                        # Git/event hooks
│   └── hook-name.sh/.ts/.py
└── templates/                    # Project templates
```

**Plugin Manifest** (plugin.json):
```json
{
  "name": "specweave-github",
  "version": "1.0.0",
  "author": { "name": "SpecWeave Team" },
  "provides": {
    "skills": ["github-sync"],
    "agents": ["github-manager"],
    "commands": ["sw-github:sync"],
    "hooks": ["post-increment-complete"]
  },
  "auto_detect": {
    "files": [".github/workflows"],
    "packages": ["@octokit/rest"],
    "git_remotes": ["github.com"]
  },
  "dependencies": {
    "plugins": ["specweave"]
  },
  "specweave_core_version": ">=1.0.0"
}
```

**25 Specialized Plugins**:

| Category | Plugins | LOC | Purpose |
|----------|---------|-----|---------|
| **Core** | specweave | 45K+ | Planning, specs, TDD, living docs |
| **Integration** | github, jira, ado | 12K+ | External tool sync |
| **Infrastructure** | k8s, kafka, confluent, infra | 18K+ | Deployment & messaging |
| **Frontend** | frontend, ui, figma, mobile | 15K+ | UI development |
| **Backend** | backend, payments | 8K+ | API & services |
| **ML/AI** | ml | 6K+ | Machine learning pipelines |
| **Testing** | testing | 5K+ | E2E, unit, QA |
| **Docs & Release** | docs, release | 4K+ | Documentation & versioning |
| **Specialized** | diagrams, n8n, cost | 3K+ | Domain-specific tools |

**Progressive Loading** (Index-based):
- Index file (~3KB) contains all trigger patterns
- Match triggers → Load only needed plugins
- 99.98% token savings vs loading all plugins
- Lazy dependency resolution

See diagrams: [diagrams/plugins/component-plugin-system.mmd](diagrams/plugins/component-plugin-system.mmd)

### 4. Hook System (Event-Driven Architecture)

**Location**: `src/core/hooks/`, `plugins/specweave/hooks/`

**Purpose**: Decoupled event processing with health checking and auto-fixing

**Hook Lifecycle**:
```
Event triggered
    ↓
HookScanner: Find matching hooks by filename
    ↓
HookHealthChecker: Validate syntax, imports, performance
    ↓
HookExecutor: Run in isolated child process (spawn)
    ↓
HookAutoFixer: Detect/fix common errors
    ↓
Notification: Report results to user
```

**Key Classes**:
- `HookExecutor` - Runs hooks as child processes with timeout (20s default)
- `HookHealthChecker` - Detects import errors, runtime errors, performance issues
- `HookScanner` - Auto-discovers hooks by filename pattern
- `HookAutoFixer` - Auto-fixes common hook errors (missing imports, syntax)
- `HookLogger` - Structured logging with rotation (7-day retention)

**Hook Types**:
- Shell hooks (`.sh`) - Executed with `bash`
- Node hooks (`.js`, `.ts`) - Executed with `node`
- Python hooks (`.py`) - Executed with `python`

**Built-in Hooks** (in specweave plugin):

| Hook | Trigger | Purpose |
|------|---------|---------|
| `auto-transition.ts` | Task completion | Auto-transition ACTIVE → READY_FOR_REVIEW |
| `update-tasks-md.ts` | Task completion | Sync AC completion across tasks.md |
| `sync-living-docs.ts` | Increment creation | Update living documentation |
| `reflection.ts` | Session end | Session-end self-reflection |
| `git-diff-analyzer.ts` | Git commit | Analyze code changes |
| `run-self-reflection.ts` | On-demand | LLM-based reflection for learning |

**Health Check Capabilities**:
- Syntax validation (linting)
- Import checking (missing dependencies)
- Performance profiling (detect slow hooks)
- Dependency resolution (external binaries)
- Memory usage tracking (detect leaks)

**Isolation Strategy**:
- Each hook runs in separate child process
- No shared state between hooks
- Timeout protection (SIGTERM after 20s)
- Error handling doesn't block main flow

### 5. Sync Engine (External Tool Integration)

**Location**: `src/core/sync/`, `plugins/specweave-{github,jira,ado}/`

**Purpose**: Bidirectional synchronization with GitHub, JIRA, and Azure DevOps

**Sync Flow**:
```
Increment update
    ↓
SyncTarget resolution: Which external tool?
    ↓
Permission enforcement: Can we write?
    ↓
Platform adapter (GitHub/JIRA/ADO)
    ↓
Create/update issue/story
    ↓
Audit logging + notifications
```

**SyncTarget Resolution** (v1.0.31+, ADR-0211):

Priority order:
1. Metadata `syncTarget` field (explicit)
2. `**Project**:` field in user story → `config.projectMappings`
3. `config.sync.defaultProfile`
4. First available profile

**Sync Profiles** (Multi-repo/multi-project support):
```json
{
  "profiles": [
    {
      "id": "github-frontend",
      "provider": "github",
      "owner": "company",
      "repo": "frontend",
      "projectMappings": {
        "frontend-app": "github-frontend",
        "admin-panel": "github-admin"
      }
    },
    {
      "id": "jira-backend",
      "provider": "jira",
      "domain": "company.atlassian.net",
      "project": "CORE"
    }
  ]
}
```

**Permission Model** (Granular):
```typescript
interface PlatformSyncPermissions {
  canRead: boolean           // Pull from external
  canUpdateStatus: boolean   // Update only status
  canUpsert: boolean        // Create/update items
  canDelete: boolean        // Delete (dangerous!)
}
```

**Sync Mapping**:

| SpecWeave | GitHub | JIRA | Azure DevOps |
|-----------|--------|------|--------------|
| Feature (FS-XXX) | Milestone | Epic | Area Path |
| User Story (US-XXX) | Issue `[FS-XXX][US-YYY]` | Story | User Story |
| Acceptance Criteria | Checkbox | Sub-task | Acceptance |
| Task (T-XXX) | Checkbox | Task | Task |

**Circuit Breaker Pattern**:
- Detects 3 consecutive sync failures
- Queues updates for later retry
- Prevents cascading failures
- User notified after 5 failures
- Auto-recovery when connection restored

**Key Components**:
- `SyncOrchestrator` - Coordinates multi-platform sync
- `GitHubAdapter` - Maps to GitHub issues
- `JIRAAdapter` - Maps to JIRA epics/stories
- `ADOAdapter` - Maps to Azure DevOps work items
- `CircuitBreaker` - Prevents failure cascades
- `AuditLogger` - Logs all sync operations

### 6. Living Documentation System

**Location**: `src/living-docs/`, `.specweave/docs/`

**Purpose**: Maintain enterprise documentation synchronized with code and specs

**6 Core Pillars**:
```
.specweave/docs/internal/
├── strategy/          # Business case, vision, OKRs (Why?)
├── specs/             # Feature specifications (What?)
│   └── FS-XXX/       # Per-feature folders
├── architecture/      # HLD, LLD, ADRs, diagrams (How?)
│   ├── adr/          # Architecture Decision Records
│   └── diagrams/     # Mermaid, SVGs
├── delivery/         # Build & release (How we build?)
├── operations/       # Runbooks, SLOs, incidents (How we run?)
└── governance/       # Security, compliance, policies (Guardrails)
```

**Key Classes**:
- `SmartDocOrganizer` - Auto-organizes docs by theme/architecture
- `ProjectDetector` - Detects project boundaries from code
- `ContentClassifier` - Classifies docs as spec, architecture, module, etc.
- `ContentParser` - Extracts structured data from markdown
- `SpecDistributor` - Distributes specs to multi-project folders

**Document Lifecycle**:
1. Draft (editing in increment)
2. Review (PR created)
3. Approved (merged to living docs)
4. Deprecated (moved to archive)

**Cross-Linking Rules**:
- Spec → ADR (link to decisions)
- Spec → Diagrams (reference architecture)
- HLD → ADR (decisions that shaped design)
- Runbook → HLD (system architecture)

**Sync Strategy**:
- `/sw:sync-specs` - Sync individual increment specs to living docs
- `/sw:sync-docs` - Strategic two-way sync (pull context OR push learnings)
- Auto-sync on increment completion (hook: `sync-living-docs.ts`)

### 7. Multi-Agent Planning System

**Location**: `src/core/agents/`, `plugins/specweave/skills/`

**Purpose**: Specialized AI agents with isolated context for planning

**Three Planning Agents**:

| Agent | Role | Focus | Tools |
|-------|------|-------|-------|
| **PM Agent** (`sw:pm`) | Product Manager | Market research, requirements, OKRs | WebSearch, Read, Write |
| **Architect Agent** (`sw:architect`) | System Architect | Technical design, trade-offs, patterns | Glob, Grep, Read, Write |
| **Tech Lead Agent** (`sw:tech-lead`) | Tech Lead | Implementation feasibility, risks, estimates | Glob, Grep, Read, LSP |

**Planning Flow** (`/sw:increment`):
```
User: /sw:increment "Add authentication"
    ↓
1. PM Agent: Market research
   - What authentication methods are standard?
   - What are user expectations?
   - What are competitors doing?
    ↓
2. Architect Agent: System design
   - OAuth 2.0 vs JWT?
   - Session management strategy
   - Security considerations
   - Component breakdown
    ↓
3. Tech Lead Agent: Implementation plan
   - Task breakdown (T-001, T-002, ...)
   - Effort estimates
   - Risk assessment
   - Testing strategy
    ↓
4. Generate Files:
   - spec.md (user stories + ACs)
   - plan.md (architecture)
   - tasks.md (granular tasks)
    ↓
5. Create Increment Folder:
   - .specweave/increments/0XXX-feature/
    ↓
6. Sync to Living Docs:
   - .specweave/docs/internal/specs/FS-XXX/
```

**Context Isolation**:
- Each agent has separate system prompt
- Each agent has separate tool set
- Each agent has separate token budget
- Prevents context pollution

See diagrams: [diagrams/flows/increment-creation-flow.mmd](diagrams/flows/increment-creation-flow.mmd)

### 8. Auto Mode (Autonomous Execution)

**Location**: `src/core/auto/`, `src/cli/commands/auto.ts`

**Purpose**: Continuous autonomous execution of tasks until completion (stop hook feedback loop)

**Architecture**:
```
START /sw:auto
  ↓
StateManager: Initialize session
  ↓
TaskQueue: Load all tasks
  ↓
LOOP: For each task
  ├─ TestGate: Pre-check (tests pass)
  ├─ HumanGate: Sensitive operations (deploy, publish)
  ├─ Execute task
  ├─ TestGate: Post-check (tests pass)
  ├─ ReportProgress
  ├─ Sync checkpoint
  └─ Continue or abort?
  ↓
COMPLETE: All tasks done or max iterations reached
  ↓
Stop Hook Dispatcher:
  ├─ Reflect Hook: Extract learnings
  ├─ Auto Hook: Continuation decision
  └─ Status Notification
```

**Key Components**:
- `SessionState` - Tracks iteration count, completion criteria, constraints
- `TaskQueue` - FIFO queue of tasks to execute
- `TestGate` - Runs `npm test` before/after task
- `HumanGate` - Blocks sensitive operations (deploy, publish, force-push)
- `E2ECoverage` - Strategically seeds test users for multi-user interactions
- `CostEstimator` - Tracks token spend per task
- `CircuitBreaker` - Stops after 3 consecutive failures

**Stop Hook Chain** (defined in hooks.json):
- `stop-reflect.sh` - Runs session reflection (learning extraction)
- `stop-auto.sh` - Decides whether to continue or stop auto mode
- `stop-sync.sh` - Syncs pending changes to external tools
- Prevents infinite loops via iteration count checks

**MVP Paths** (Auto-execution focus):
- Authentication flows (login/logout)
- Core CRUD operations
- Payment processing
- Data integrity checks

**Pragmatic Completion**:
- **MUST**: MVP paths, security flows, data integrity, user-facing errors
- **SHOULD**: Edge cases, performance optimizations, nice-to-haves
- **CAN SKIP**: Conflicting requirements (ask user), over-engineered cases, obsolete tasks

**Test Strategy**:
- **Unit tests**: >80% coverage target
- **E2E tests**: MVP paths + multi-user scenarios
- **Test users**: Global auth setup + `storageState` (reuse across tests)
- **Auth pattern**: Login ONCE in setup, reuse session via `playwright/.auth/user.json`

**Execution Limits**:
- Max 100 iterations per session
- Max 10 iterations per task
- Timeout: 30 minutes per task
- Circuit breaker: 3 consecutive failures

See diagrams: [diagrams/flows/auto-mode-flow.mmd](diagrams/flows/auto-mode-flow.mmd)

---

## Key Design Patterns

### 1. State Machine Pattern (Increment Lifecycle)

**Explicit states with guard conditions**:
- PLANNING (lightweight, parallel-safe)
- ACTIVE (consumes team capacity)
- READY_FOR_REVIEW (gating status, prevents auto-completion bugs)
- COMPLETED (user-approved)
- PAUSED/ABANDONED/BACKLOG

**Guards**:
- WIP limits (ACTIVE + PAUSED + READY_FOR_REVIEW count)
- Staleness detection (auto-warn after 30 days)
- Auto-abandon experiments after 14 days

### 2. Event-Driven Architecture (Hooks)

**Decoupled event processing**:
- Hook triggers on git events, status changes
- Child process isolation (no cross-contamination)
- Health checking and auto-fixing
- Structured logging with rotation

### 3. Adapter Pattern (External Tools)

**Abstract platform differences**:
- GitHub API → GitHub Issues
- JIRA API → JIRA Stories/Epics
- ADO API → ADO Work Items
- Unified sync model across all three

### 4. Factory Pattern (Command Creation)

**Dynamic command loading** based on increment type:
- Feature commands → planning agents
- Bug commands → SRE investigation tools
- Hotfix commands → bypass limits

### 5. Strategy Pattern (Sync Resolution)

**Multiple strategies for target resolution**:
1. Explicit metadata
2. Project mapping lookup
3. Default profile
4. First available profile

### 6. Observer Pattern (Task Completion)

**Cascade updates when task completes**:
1. Task marked [x]
2. Auto-sync all ACs in that task to [x]
3. Update spec.md acceptance criteria
4. Check if ALL tasks done
5. If yes, auto-transition ACTIVE → READY_FOR_REVIEW
6. Notify user

### 7. Specification-First Pattern

**Specs as source of truth**:
```
spec.md (user stories + ACs) ← source of truth
   ↓
plan.md (architecture)
   ↓
tasks.md (granular work)
   ↓
Implementation + tests
   ↓
AC completion feedback loop
```

### 8. Multi-Agent Pattern (Planning)

**Three specialized agents with isolated context**:
- **PM Agent** (`sw:pm`) - Market research, requirements, OKRs
- **Architect Agent** (`sw:architect`) - System design, trade-offs, patterns
- **Tech Lead Agent** (`sw:tech-lead`) - Implementation feasibility, risks, estimates

Each agent has separate system prompt, tools, and token budget.

---

## Data Flow Diagrams

### Increment Creation Flow

See: [diagrams/flows/increment-creation-flow.mmd](diagrams/flows/increment-creation-flow.mmd)

### Task Completion Flow

See: [diagrams/flows/task-completion-flow.mmd](diagrams/flows/task-completion-flow.mmd)

### Auto Mode Flow (Stop Hook Feedback Loop)

See: [diagrams/flows/auto-mode-flow.mmd](diagrams/flows/auto-mode-flow.mmd)

---

## Plugin System

### Plugin Development Guide

**1. Create Plugin Structure**:
```bash
mkdir -p plugins/my-plugin/{.claude-plugin,skills,agents,commands,hooks}
```

**2. Create plugin.json**:
```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "author": { "name": "Your Name" },
  "provides": {
    "skills": ["my-skill"],
    "agents": ["my-agent"],
    "commands": ["my:command"]
  },
  "auto_detect": {
    "files": [".my-config"],
    "packages": ["my-package"]
  }
}
```

**3. Create Skill** (`skills/my-skill/SKILL.md`):
```markdown
# My Skill

## Triggers
- keyword1
- keyword2
- phrase pattern

## Description
What this skill does.

## System Prompt
You are an expert in...
```

**4. Create Agent** (`agents/my-agent/AGENT.md`):
```markdown
# My Agent

## Role
Specialized agent for...

## Tools
- Tool1
- Tool2

## System Prompt
You are a specialized agent for...
```

**5. Create Command** (`commands/my-command.ts`):
```typescript
import { Command } from 'commander';

export function registerCommand(program: Command) {
  program
    .command('my:command')
    .description('Do something')
    .action(async () => {
      // Implementation
    });
}
```

**6. Register in Marketplace**:
```bash
# Add to plugins/PLUGINS-INDEX.md
# Submit PR to specweave/specweave repo
```

### Plugin Best Practices

1. **Auto-detection**: Use specific files/packages for accurate detection
2. **Trigger patterns**: Use clear, unambiguous keywords
3. **System prompts**: Be specific about agent capabilities
4. **Dependencies**: Declare plugin dependencies explicitly
5. **Versioning**: Follow semantic versioning
6. **Documentation**: Include README.md with examples

---

## External Integrations

### GitHub Integration

**Plugin**: `specweave-github`

**Sync Mapping**:
- Feature → GitHub Milestone
- User Story → GitHub Issue `[FS-XXX][US-YYY] Title`
- Task → Checkbox in issue body
- Acceptance Criteria → Checkbox + comment

**Two-way sync**:
- **Push**: spec.md → GitHub issue
- **Pull**: GitHub comments → notifications
- **Reconciliation**: Resolve drift

**Commands**:
- `/sw-github:sync` - Full bidirectional sync
- `/sw-github:create` - Create issue from increment
- `/sw-github:push` - Push local changes
- `/sw-github:pull` - Pull external changes
- `/sw-github:close` - Close issue when increment complete
- `/sw-github:reconcile` - Fix drift

### JIRA Integration

**Plugin**: `specweave-jira`

**Sync Mapping**:
- Project → JIRA Project
- Feature → JIRA Epic
- User Story → JIRA Story
- Task → JIRA Sub-task
- Acceptance Criteria → Story point/label

**Board-based organization**: 2-level directory structure
- Level 1: JIRA project (e.g., "CORE")
- Level 2: JIRA board (e.g., "Frontend", "Backend")

**Commands**:
- `/sw-jira:sync` - Full bidirectional sync
- `/sw-jira:create` - Create epic/story from increment
- `/sw-jira:push` - Push local changes
- `/sw-jira:pull` - Pull external changes
- `/sw-jira:close` - Close issue when increment complete

### Azure DevOps Integration

**Plugin**: `specweave-ado`

**Sync Mapping**:
- Area path → SpecWeave project
- Epic → Feature
- User Story → User Story
- Task → Task
- Work item type alignment

**Area path hierarchy**: 2-level structure for organization

**Commands**:
- `/sw-ado:sync` - Full bidirectional sync
- `/sw-ado:create` - Create work item from increment
- `/sw-ado:push` - Push local changes
- `/sw-ado:pull` - Pull external changes
- `/sw-ado:close` - Close work item when increment complete

---

## Performance & Scalability

### Increment Management
- **Lazy loading** of metadata (created on first read)
- **Incremental validation** (only changed fields)
- **Batch operations** for archive/cleanup
- **Deduplication system** to prevent duplicate IDs

### Sync System
- **Circuit breaker pattern** (stop after 3 failures)
- **Rate limiting** (15-min intervals default)
- **Async background jobs** (scheduler)
- **Audit logging** for all sync operations

### Hook System
- **Child process isolation** (no context bloat)
- **Timeout protection** (20s default)
- **Health checking** before execution
- **Error recovery** with auto-fixing

### Plugin System
- **Progressive loading** (index only, match triggers)
- **99.98% token savings** vs loading all plugins
- **Lazy dependency resolution**
- **Cache warming** on demand

---

## Security Model

### Permission Model
- **Per-platform granularity**: GitHub ≠ JIRA ≠ ADO
- **Per-operation granularity**: Read, Update Status, Upsert, Delete
- **Default: Safe** (read-only, no writes)
- **Explicit approval** required for sensitive operations

### Audit Trail
- All sync operations logged to `.specweave/logs/sync-audit-YYYY-MM-DD.log`
- Metadata includes `syncTarget.setAt` and `derivedFrom`
- Hook execution results captured and rotated

### Secrets Management
- Tokens in `.env` (not in config.json)
- Automatic `.env` validation before operations
- Support for managed authentication (gh, jira, wrangler CLIs)

---

## Development Guide

### Prerequisites

- Node.js >=20.12.0
- npm >=10.0.0
- TypeScript >=5.0.0

### Setup

```bash
# Clone repo
git clone https://github.com/specweave/specweave.git
cd specweave

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Install globally for development
npm link
```

### Project Structure

```
specweave/
├── src/                    # Core framework (215K+ LOC)
│   ├── adapters/          # LLM adapters
│   ├── cli/               # Command-line interface
│   ├── config/            # Configuration management
│   ├── core/              # Core functionality (48 subdirectories)
│   ├── generators/        # Code/doc generators
│   ├── hooks/             # Git and event hooks
│   ├── importers/         # Brownfield importers
│   ├── init/              # Project initialization
│   ├── living-docs/       # Living docs builder
│   ├── sync/              # External tool sync
│   ├── templates/         # Project templates
│   ├── types/             # Type definitions
│   └── utils/             # Utility functions
├── plugins/               # 25+ specialized plugins
├── tests/                 # Test suites
├── docs-site/             # Public documentation
└── .specweave/            # Internal living docs
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests
npm run test:all

# Coverage
npm run test:coverage
```

### Coding Standards

- **Logger**: Prefer `logger` over `console.*` in new code
- **Imports**: ALWAYS `.js` extensions (enforced)
- **Tests**: `.test.ts` files, `vi.fn()` (not jest), `os.tmpdir()` (not cwd)
- **Filesystem**: Prefer native `fs` (fs-extra only in legacy utils)
- **Config vs Secrets**: Config in `config.json`, secrets in `.env`

### Key Files to Understand

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | CLI entry point |
| `src/core/increment/metadata-manager.ts` | Increment CRUD |
| `src/core/specs/spec-parser.ts` | Parse spec.md |
| `src/core/hooks/hook-executor.ts` | Hook execution engine |
| `src/core/sync/sync-orchestrator.ts` | Multi-platform sync |
| `src/living-docs/living-docs-builder.ts` | Documentation generator |

---

## References

### Internal Documentation

- **Architecture Decision Records**: [.specweave/docs/internal/architecture/adr/](.specweave/docs/internal/architecture/adr/)
- **Diagrams**: [.specweave/docs/internal/architecture/diagrams/](diagrams/)
- **Specs**: [.specweave/docs/internal/specs/](.specweave/docs/internal/specs/)
- **Operations**: [.specweave/docs/internal/operations/](.specweave/docs/internal/operations/)

### External Resources

- **Public Docs**: https://spec-weave.com
- **GitHub Repo**: https://github.com/specweave/specweave
- **NPM Package**: https://www.npmjs.com/package/specweave
- **Claude Plugin Marketplace**: (coming soon)

### Key ADRs

- **ADR-0001**: Use TypeScript for type safety
- **ADR-0062**: GitHub marketplace mode for plugins
- **ADR-0140**: Derive FS-ID from increment number
- **ADR-0211**: SyncTarget explicit in metadata
- **ADR-0212+**: Multi-project, multi-platform, permission model

---

**Last Updated**: 2026-01-08
**Document Owner**: SpecWeave Architecture Team
**Review Cycle**: Quarterly
