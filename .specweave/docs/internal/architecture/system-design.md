# SpecWeave System Design - Architecture Overview

**Last Updated**: 2025-11-16
**Version**: 2.1
**Author**: Architect Agent

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Core Framework Architecture](#core-framework-architecture)
4. [Plugin Architecture](#plugin-architecture)
5. [Workflow Orchestration Architecture](#workflow-orchestration-architecture)
6. [Kafka Event Streaming Plugin Suite](#kafka-event-streaming-plugin-suite)
7. [Multi-Project Sync Architecture](#multi-project-sync-architecture)
8. [Living Documentation System](#living-documentation-system)
9. [Serverless Architecture Intelligence](#serverless-architecture-intelligence)
10. [Security Architecture](#security-architecture)
11. [Performance & Scalability](#performance--scalability)
12. [Deployment Architecture](#deployment-architecture)

---

## System Overview

SpecWeave is a spec-driven development framework built on Claude Code's native plugin system. The framework enables AI-assisted development workflows through incremental delivery, living documentation, and external tool synchronization.

**Core Tenets**:
- **Spec-Driven**: All work starts from specifications (PRD → Spec → Tasks → Code)
- **Increment-Based**: Work organized in measurable increments (1-2 weeks)
- **Living Documentation**: Specs evolve with the project (not stale)
- **Claude Code Native**: Leverages Claude Code's plugins, agents, skills, hooks
- **75% Context Reduction**: Modular plugins activate only when needed

**Primary Users**:
- Solo developers (startup MVPs, side projects)
- Small teams (2-10 developers)
- Open-source contributors
- AI-assisted development advocates

---

## Architecture Principles

### 1. Plugin-First Architecture

**Every component is a plugin**. There is no "core framework" separate from plugins.

```
SpecWeave = specweave (plugin) + specweave-github (plugin) + specweave-kafka (plugin) + ...
```

**Rationale**: Uniform architecture, no special cases, easy to extend.

**Reference**: ADR-0035 (Kafka Multi-Plugin Architecture)

### 2. Context Efficiency

**Goal**: Reduce AI context window usage by 75%+.

**How**:
- Skills auto-activate based on keywords (Claude Code native behavior)
- Plugins install globally but only load when needed
- Living docs extracted from increments (avoid duplication)
- External sync reduces context pollution

**Metrics**:
- Core plugin: ~12K tokens (all framework features)
- Average plugin: 4-8K tokens
- Result: 75% smaller than v0.3.7 (50K tokens)

### 3. Separation of Concerns

**Five Documentation Layers** (cross-project):
- **Strategy**: Business rationale (Why?)
- **Architecture**: System-wide technical design (How?)
- **Delivery**: Build & release (How we build)
- **Operations**: Production ops (How we run)
- **Governance**: Policies (Guardrails)

**Multi-Project Organization** (flattened):
- `specs/{project-id}/` - Living documentation specs
- `modules/{project-id}/` - Module documentation
- `team/{project-id}/` - Team playbooks
- `project-arch/{project-id}/` - Project-specific ADRs
- `legacy/{project-id}/` - Brownfield imports

**Reference**: [Internal Docs README](../docs/internal/README.md)

### 4. Vendor Neutrality

**Open standards over vendor lock-in**:
- Markdown + YAML (not proprietary formats)
- Claude Code plugin system (Anthropic standard)
- MCP protocol (Model Context Protocol)
- Prometheus metrics (industry standard)
- OpenTelemetry tracing (CNCF graduated)

**Exceptions** (justified):
- Claude Code (no viable alternative for AI-native IDE)
- Confluent Cloud (optional, Confluent-specific features)

### 5. Progressive Disclosure

**Show complexity only when needed**:
- Quick start: `specweave init` → 3 commands (`/increment`, `/do`, `/done`)
- Intermediate: Multi-repo, GitHub sync, living docs
- Advanced: Plugin development, brownfield migration, DORA metrics

**Documentation Strategy**:
- README: Quick start only
- Docs site: Comprehensive guides (progressively disclosed)
- ADRs: Architecture decisions (for contributors)

---

## Core Framework Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code (AI IDE)                         │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         SpecWeave Plugin Marketplace                   │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │     │
│  │  │  specweave   │  │ specweave-   │  │ specweave-  │  │     │
│  │  │   (core)     │  │   github     │  │   kafka     │  │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │     │
│  │  │ specweave-   │  │ specweave-   │  │    ...      │  │     │
│  │  │  confluent   │  │    n8n       │  │ (19+ total) │  │     │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  .specweave/ (Project Data)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ increments/  │  │ docs/        │  │ config.json         │   │
│  │  0001-*      │  │  internal/   │  │ (project config)    │   │
│  │  0002-*      │  │  public/     │  │                     │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Tools (Bidirectional Sync)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ GitHub       │  │ JIRA         │  │ Azure DevOps        │   │
│  │ (Issues)     │  │ (Stories)    │  │ (Work Items)        │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Core Plugin (`specweave`)

**Size**: ~12K tokens
**Purpose**: Increment lifecycle + Living docs automation

**Components**:
- **Skills** (9): increment-planner, spec-generator, tdd-workflow, context-loader, project-kickstarter, brownfield-analyzer, brownfield-onboarder, increment-quality-judge, context-optimizer
- **Agents** (22): PM, Architect, Tech Lead, + 19 specialized (tdd-orchestrator, qa-specialist, etc.)
- **Commands** (22): /increment, /do, /done, /validate, /qa, /status, /progress, /check-tests, + 14 specialized
- **Hooks** (8): post-task-completion, pre-tool-use, post-increment-planning, etc.

**Key Features**:
- Increment lifecycle management
- Living docs sync (intelligent distribution)
- Bidirectional task ↔ user story linking
- GitHub issue auto-creation
- Metadata validation & fallback

**Reference**: [CLAUDE.md](../../../../CLAUDE.md)

---

## Plugin Architecture

### Plugin Structure (Claude Code Standard)

```
plugins/specweave-{name}/
├── .claude-plugin/
│   └── plugin.json          # Claude native manifest
├── skills/                  # Auto-activating capabilities
│   └── {skill-name}/
│       └── SKILL.md         # YAML frontmatter + markdown
├── agents/                  # Specialized AI agents
│   └── {agent-name}/
│       └── AGENT.md         # YAML frontmatter + markdown
├── commands/                # Slash commands
│   └── {command-name}.md    # YAML frontmatter + markdown
├── hooks/
│   ├── hooks.json           # Hook registration
│   └── *.sh                 # Hook scripts
└── lib/                     # TypeScript utilities (optional)
    └── *.ts
```

### Plugin Discovery & Activation

**Installation** (via Claude Code CLI):
```bash
# Global marketplace registration (persists across all projects)
claude plugin marketplace add anton-abyzov/specweave

# Install all plugins (via specweave init)
claude plugin install specweave
claude plugin install specweave-github
claude plugin install specweave-kafka
# ... (all 19+ plugins installed automatically)
```

**Activation** (automatic, context-based):
- Skills activate based on description keywords
- Agents invoked via Task tool
- Commands available via `/` prefix
- Hooks fire on lifecycle events

**Context Efficiency**:
- All plugins installed ≠ all plugins loaded
- Only relevant skills activate per conversation
- Result: Even with 19+ plugins, only pay for what you use

---

## Workflow Orchestration Architecture

**Status**: Active Development (v0.22.0)
**Increment**: [0039-ultra-smart-next-command](../../increments/0039-ultra-smart-next-command/)

### Overview

The Workflow Orchestration Architecture enables **autonomous workflow execution** through the Ultra-Smart Next Command (`/specweave:next --autonomous`). This system automatically detects the current workflow phase, invokes appropriate commands, and guides users through the entire SpecWeave development lifecycle.

**Vision**: "Ship features while you sleep" - autonomous end-to-end delivery from spec.md to closed increment.

**Key Capabilities**:
- **Auto-Detect Workflow Phase** with 95%+ accuracy and confidence scoring
- **Auto-Call Commands** based on detected phase (plan → do → validate → qa → done)
- **Intelligent Backlog Suggestions** (priority ranking, dependency validation)
- **Autonomous Mode** for zero-prompt execution (--autonomous flag)
- **Multi-Layered Safety** (infinite loop prevention, cost estimation, user control)

### Architecture Components

```
┌─────────────────────────────────────────────────────────────────┐
│                  /specweave:next (Entry Point)                   │
│         • Interactive Mode (default)                             │
│         • Autonomous Mode (--autonomous)                         │
│         • Dry-Run Mode (--dry-run)                               │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          WorkflowOrchestrator (Core Orchestration Logic)         │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ PhaseDetector      │  │ CommandInvoker     │                 │
│  │ • Multi-signal     │  │ • Programmatic     │                 │
│  │ • Confidence 0-1   │  │   command exec     │                 │
│  │ • 95%+ accuracy    │  │ • Error handling   │                 │
│  └────────────────────┘  └────────────────────┘                 │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ ConfidenceScorer   │  │ StateManager       │                 │
│  │ • Weighted signals │  │ • Checkpointing    │                 │
│  │ • Thresholds       │  │ • State recovery   │                 │
│  └────────────────────┘  └────────────────────┘                 │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │ BacklogScanner     │  │ CostEstimator      │                 │
│  │ • Priority ranking │  │ • AI call estimate │                 │
│  │ • Dependency check │  │ • Cost thresholds  │                 │
│  └────────────────────┘  └────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Existing Commands (Programmatic Invocation)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ /specweave:  │  │ /specweave:  │  │ /specweave:  │          │
│  │ plan (NEW)   │  │ do           │  │ validate     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ /specweave:  │  │ /specweave:  │                            │
│  │ qa           │  │ done         │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow State Machine

**12 Workflow Phases** (complete lifecycle):

1. **NO_INCREMENTS**: No active increments exist → Suggest /specweave:increment or backlog
2. **BACKLOG_AVAILABLE**: Backlog items exist → Rank by priority, show top 3
3. **NEEDS_PLANNING**: spec.md exists, no plan.md → Auto-call /specweave:plan
4. **PLANNING_IN_PROGRESS**: Planning underway → Monitor progress
5. **NEEDS_EXECUTION**: plan.md + tasks.md exist, tasks incomplete → Auto-call /specweave:do
6. **EXECUTION_IN_PROGRESS**: Tasks being worked on → Continue execution
7. **NEEDS_VALIDATION**: All P1 tasks done → Suggest /specweave:validate
8. **VALIDATION_FAILED**: Validation errors found → User fixes issues
9. **NEEDS_QA**: Validation passed → Suggest /specweave:qa
10. **QA_FAILED**: QA issues found → User fixes issues
11. **NEEDS_CLOSURE**: QA passed → Auto-call /specweave:done
12. **NEEDS_NEXT_INCREMENT**: Current closed → Find next or suggest backlog

**State Machine Diagram**: [state-machine.mmd](diagrams/workflow-orchestration/state-machine.mmd)

### Phase Detection Algorithm

**Multi-Signal Heuristic** (enhanced from ADR-0003-009):

**Signal Categories**:
- **File Signals** (weight: 0.8-0.9): spec.md, plan.md, tasks.md existence/corruption
- **Task Signals** (weight: 0.7-0.8): Incomplete tasks, P1 tasks done, all tasks done
- **Metadata Signals** (weight: 0.6-0.8): status, validatedAt, qaRunAt timestamps
- **User Signals** (weight: 0.5-0.6): Keywords, recent commands, explicit hints
- **Project Signals** (weight: 0.3-0.5): Multi-project keywords, team patterns

**Confidence Calculation**:
```
Confidence = (WeightedAverage of Signals)
           - (Contradiction Penalty)
           + (Agreement Boost)

Normalized to 0.0 - 1.0
```

**Confidence Thresholds**:
- **High (>= 0.9)**: Auto-proceed (no prompt)
- **Medium (0.7 - 0.9)**: Proceed with confirmation
- **Low (< 0.7)**: Always prompt user
- **Very Low (< 0.5)**: Require --force flag

**Accuracy Target**: >= 95% on common workflows (unit tested)

**Reference**: [ADR-0044: Phase Detection Enhancement](adr/0044-phase-detection-enhancement.md)

### Command Orchestration

**Auto-Call Logic** (based on detected phase):

| Phase | Confidence | Auto-Action | User Prompt |
|-------|------------|-------------|-------------|
| NO_INCREMENTS | 1.0 (high) | Suggest /specweave:increment or backlog | Yes (show options) |
| NEEDS_PLANNING | 0.95 (high) | /specweave:plan | No (auto-proceed) |
| NEEDS_EXECUTION | 0.92 (high) | /specweave:do (loop) | No (auto-proceed) |
| NEEDS_VALIDATION | 0.85 (medium) | /specweave:validate | Yes (if < 0.9) |
| NEEDS_QA | 0.78 (medium) | /specweave:qa | Yes (if < 0.9) |
| NEEDS_CLOSURE | 0.96 (high) | /specweave:done | No (auto-proceed) |

**Command Invocation Flow**: [command-flow.mmd](diagrams/workflow-orchestration/command-flow.mmd)

**New Command: /specweave:plan**:
- Accepts optional increment ID (`/specweave:plan 0039`)
- Auto-detects current increment if no ID
- Invokes Architect Agent → create plan.md
- Invokes test-aware-planner → create tasks.md with embedded tests
- Updates metadata.json (planningCompletedAt)

### Autonomous Mode

**Autonomous Execution** (`--autonomous` flag):

**Workflow**:
```bash
# User runs ONCE
/specweave:next --autonomous

# System executes automatically (zero prompts):
1. Estimate cost upfront ($5.50, 45 min)
2. Auto-plan (if spec.md exists)
3. Auto-execute all tasks (loop /specweave:do)
4. Auto-validate (when all P1 tasks done)
5. Auto-run QA (when validation passes)
6. Auto-close (when QA passes)
7. Auto-start next backlog item (respect WIP limits)
```

**Safety Guardrails** (7 layers):

1. **Infinite Loop Prevention**:
   - Max iterations: 50 (configurable)
   - Same-phase retry limit: 3
   - Phase loop detection (abort if same phase repeated)

2. **Critical Error Handling**:
   - Tests failing → abort
   - Validation errors → abort
   - QA failures → abort
   - File corruption → abort

3. **WIP Limit Enforcement**:
   - Respect config.workflow.wipLimit (default: 3)
   - Don't auto-start backlog if WIP limit reached

4. **User Control & Abort**:
   - Ctrl+C to abort at any time
   - Low confidence (< 0.7) → prompt user (safety override)

5. **Checkpointing & Recovery**:
   - Save checkpoint after each successful action
   - Resume from last checkpoint on abort

6. **Execution Logging**:
   - Detailed JSON log (all actions, errors, checkpoints)
   - Human-readable report.md (post-mortem)

7. **Cost Estimation & Limits**:
   - Estimate AI calls + cost before execution
   - Block CRITICAL cost (> $20)
   - Prompt HIGH cost ($5-$20)

**Reference**: [ADR-0045: Autonomous Mode Safety](adr/0045-autonomous-mode-safety.md)

### Intelligent Backlog Suggestions

**Backlog Scanning**:
- Scan `.specweave/increments/_backlog/` for items
- Rank by priority (P1 > P2 > P3)
- Filter by dependency status (only show items with met dependencies)
- Display top 3 recommendations with rationale

**Recommendation Algorithm**:
```
Score = (Priority Weight × 10)
      + (Dependency Met × 5)
      + (Project Match × 3)
      + (Team Match × 2)

Normalize to 0.0 - 1.0
```

**Output**:
```
Top 3 Backlog Recommendations:

1. [0040-github-sync-enhancement] (Score: 0.92, P1)
   • All dependencies met (0035, 0036)
   • Project match: specweave-github
   • Estimated: 3 days, $12

2. [0041-jira-integration] (Score: 0.85, P1)
   • All dependencies met (0036)
   • Estimated: 5 days, $18

3. [0042-multi-repo-support] (Score: 0.78, P2)
   • Dependency pending: 0040
   • Estimated: 4 days, $15
```

### Data Model

**Core Data Structures**:
- **PhaseDetectionResult**: { phase, confidence, signals, reasoning }
- **AutonomousExecutionLog**: { sessionId, actions, errors, checkpoints, costEstimate }
- **ActionLog**: { iteration, timestamp, phase, action, confidence, result, durationMs }
- **Checkpoint**: { timestamp, iteration, phase, lastAction, metadata }
- **CostEstimate**: { aiCalls, estimatedCost, estimatedDuration, riskLevel }

**Storage**:
- Execution logs: `.specweave/increments/{id}/logs/autonomous-execution-{sessionId}.json`
- Checkpoints: `.specweave/increments/{id}/logs/autonomous-checkpoints.json`
- Reports: `.specweave/increments/{id}/reports/autonomous-execution-{sessionId}.md`
- Metadata: Enhanced `metadata.json` with workflow.lastPhase, workflow.lastPhaseConfidence

**Complete Data Model**: [workflow-state.md](data-models/workflow-state.md)

### Performance Targets

| Operation | Target | Rationale |
|-----------|--------|-----------|
| **Phase Detection** | < 500ms | Fast enough for real-time UI |
| **Command Orchestration** | < 1s | Minimal delay before execution |
| **Backlog Scanning** | < 2s | Handle 1000+ items |
| **Confidence Calculation** | < 100ms | Lightweight heuristic |
| **Autonomous Full Workflow** | < 10 min | Reasonable for unattended execution |

### Integration Points

**Existing Systems**:
- **Phase Detection (ADR-0003-009)**: Enhanced with confidence scoring
- **PM Agent Validation Gates**: Invoked before auto-closure
- **Increment Lifecycle State Machine**: Detect state transitions
- **Multi-Project Support (v0.16.11+)**: Project-aware phase detection

**New Commands**:
- `/specweave:plan` - Extracted from /do, reusable for orchestration
- `/specweave:next --autonomous` - Zero-prompt full automation
- `/specweave:next --dry-run` - Preview workflow without execution

### Architecture Diagrams

**C4 Level 1 (System Context)**:
```
Developer → /specweave:next → SpecWeave Workflow Orchestrator
                            → Existing Commands (plan, do, validate, qa, done)
                            → Increment Metadata + Backlog
```

**C4 Level 2 (Container Diagram)**:
See [command-flow.mmd](diagrams/workflow-orchestration/command-flow.mmd) for complete sequence diagram.

**C4 Level 3 (Component Diagram)**:
- WorkflowOrchestrator
  - PhaseDetector (multi-signal heuristic)
  - ConfidenceScorer (weighted calculation)
  - CommandInvoker (programmatic execution)
  - StateManager (checkpointing, recovery)
  - BacklogScanner (priority ranking)
  - CostEstimator (AI call estimation)

### Testing Strategy

**Unit Tests** (100+ test cases):
- Phase detection scenarios (file existence, task completion, metadata)
- Confidence calculation (weighted average, contradiction penalty, agreement boost)
- Backlog ranking (priority, dependencies, project match)
- Cost estimation (AI calls, thresholds)

**Integration Tests**:
- Full workflow: spec.md → plan → do → validate → qa → done
- Multi-project mode (project-specific detection)
- Error handling (missing files, agent failures)
- Autonomous mode (end-to-end automation)

**E2E Tests** (Playwright):
- Real SpecWeave project (create increment → close with /specweave:next)
- Backlog suggestions (no active increments → suggest backlog)
- Confidence prompting (low confidence → user override)
- Error recovery (corrupt plan.md → graceful error)

**Performance Tests**:
- Phase detection latency (< 500ms)
- Backlog scanning scalability (1000+ items)
- Command orchestration overhead (< 1s)

### Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Time-to-Completion Reduction** | 4 min overhead | 30 sec (87.5% reduction) | Command execution logs |
| **Phase Detection Accuracy** | N/A | >= 95% | Unit tests, user error reports |
| **User Satisfaction** | N/A | 85%+ report "easier workflow" | Post-implementation survey |
| **Autonomous Mode Adoption** | 0% | 30%+ of power users | Usage analytics |
| **Error Rate** | N/A | < 5% of executions | Error logs, user reports |

### Configuration

**Workflow Settings** (`.specweave/config.json`):
```json
{
  "workflow": {
    "autonomous": {
      "maxIterations": 50,
      "maxSamePhaseRetries": 3,
      "lowConfidenceThreshold": 0.7,
      "costThreshold": {
        "low": 1,
        "medium": 5,
        "high": 20
      },
      "autoStartBacklog": true,
      "enableCheckpointing": true,
      "logVerbosity": "detailed"
    },
    "wipLimit": 3
  }
}
```

### Future Enhancements (Post-MVP)

**v2 Improvements**:
- ML-based phase detection (train on user feedback, > 98% accuracy)
- Custom workflow phases (user-defined: design → prototype → test → ship)
- Team coordination (multi-user workflow, handoff detection)
- Predictive suggestions ("You usually work on X after closing Y")

**v3 Vision**:
- Voice commands ("Claude, what's next?" → auto-execute)
- Slack/Discord bot (/next in team chat → auto-post progress)
- CI/CD integration (auto-deploy when increment closes with --autonomous)

### Related Documentation

**Architecture Decisions**:
- [ADR-0043: Workflow Orchestration Architecture](adr/0043-workflow-orchestration-architecture.md)
- [ADR-0044: Phase Detection Enhancement](adr/0044-phase-detection-enhancement.md)
- [ADR-0045: Autonomous Mode Safety](adr/0045-autonomous-mode-safety.md)

**Living Specs**:
- [SPEC-0039: Ultra-Smart Next Command](../../specs/specweave/spec-0039-ultra-smart-next-command.md)

**User Stories**:
- [US-001: Auto-Detect Current Workflow Phase](../../specs/specweave/FS-039/us-001-auto-detect-workflow-phase.md)
- [US-007: Implement /specweave:plan Command](../../specs/specweave/FS-039/us-007-implement-plan-command.md)
- [US-010: Autonomous Workflow Mode](../../specs/specweave/FS-039/us-010-autonomous-workflow-mode.md)

---

## Kafka Event Streaming Plugin Suite

### Architecture Overview

**Four Plugins** (modular, independently installable):

1. **specweave-kafka** (Core, ~8K tokens)
   - Apache Kafka, Redpanda, AWS MSK, Azure Event Hubs
   - MCP server integration (kanapuli, tuannvm, Joel-hanson)
   - CLI tools (kcat, kcli, kaf)
   - Monitoring (Prometheus + Grafana, OpenTelemetry)
   - Terraform modules (self-hosted, AWS MSK, Azure Event Hubs)

2. **specweave-confluent** (Managed Service, ~5K tokens)
   - Confluent Cloud integration
   - Schema Registry, ksqlDB, Kafka Connect
   - Confluent MCP server
   - Terraform (Confluent provider)
   - Cost optimization, RBAC

3. **specweave-kafka-streams** (Stream Processing, ~4K tokens)
   - Kafka Streams API
   - Red Hat AMQ Streams (OpenShift)
   - Strimzi operator
   - Stateful transformations (RocksDB)

4. **specweave-n8n** (Workflow Automation, ~4K tokens)
   - n8n Kafka Trigger/Producer nodes
   - MCP Server Trigger (2025 feature)
   - Pre-built workflow templates
   - AI-driven event processing

**Total Size**: ~21K tokens (all 4 plugins)
**Typical Usage**: ~12K tokens (specweave-kafka + one other)

### Architecture Decisions

**ADR-0035**: Multi-Plugin Architecture
- **Decision**: 4 separate plugins (not monolithic)
- **Rationale**: Modular installation, focused skills, context efficiency
- **Trade-offs**: More maintenance vs better UX

**ADR-0036**: MCP Server Selection
- **Decision**: Support all 4 MCP servers with auto-detection
- **Rationale**: Maximum flexibility, graceful fallback
- **Trade-offs**: Testing overhead vs vendor neutrality

**ADR-0037**: Terraform Provider Strategy
- **Decision**: Multi-provider (Confluent, Mongey, AWS, Azure)
- **Rationale**: Best-in-class features per platform
- **Trade-offs**: Configuration complexity vs platform flexibility

**ADR-0038**: Monitoring Stack Selection
- **Decision**: Prometheus + Grafana (default), OpenTelemetry (optional), cloud-native (fallback)
- **Rationale**: Industry standard, distributed tracing support
- **Trade-offs**: Setup complexity vs feature completeness

**ADR-0039**: n8n Integration Approach
- **Decision**: Native n8n nodes + MCP Server Trigger (hybrid)
- **Rationale**: Stability (native) + AI capabilities (MCP)
- **Trade-offs**: Two integration paths vs future-proof

### Architecture Diagrams

**C4 Level 1: System Context**
- [system-context.mmd](diagrams/kafka-plugin/system-context.mmd)
- Shows: Developers, DevOps, SRE → SpecWeave → Kafka platforms + tools

**C4 Level 2: Container Diagram**
- [system-container.mmd](diagrams/kafka-plugin/system-container.mmd)
- Shows: 4 plugins, Kafka infrastructure, observability stack, MCP layer, automation

**C4 Level 3: Component Diagram**
- [component-diagram.mmd](diagrams/kafka-plugin/component-diagram.mmd)
- Shows: specweave-kafka plugin internals (skills, agents, commands, lib, terraform, templates)

### Technology Stack

**Core Dependencies**:
- **Runtime**: Node.js 18+, TypeScript 5.0+
- **Kafka Client**: kafkajs (Node.js), franz-go (Go, for MCP servers)
- **MCP Servers**: kanapuli/mcp-kafka, tuannvm/kafka-mcp-server, Confluent MCP server
- **CLI Tools**: kcat (primary), kcli, kaf, kafkactl
- **IaC**: Terraform 1.5+ (Confluent provider, Mongey/kafka provider, AWS provider, AzureRM provider)
- **Monitoring**: Prometheus, Grafana, kafka_exporter, JMX Exporter, OpenTelemetry Collector
- **Workflow Automation**: n8n (Docker or cloud-hosted)

**Platforms Supported**:
- Apache Kafka 3.6+ (self-hosted, KRaft mode)
- Confluent Cloud (managed Kafka)
- Redpanda 23.3+ (Kafka-compatible)
- AWS MSK (Amazon Managed Streaming for Kafka)
- Azure Event Hubs (Kafka API)

### Data Flow Architecture

**Message Production Flow**:
```
Developer
  → Claude Code (/specweave-kafka:produce)
  → specweave-kafka plugin
  → MCP Server (kanapuli/tuannvm) OR kcat CLI
  → Kafka Cluster
  → Topic → Partition
```

**Message Consumption Flow**:
```
Kafka Topic
  → Consumer Group (kafkajs)
  → Message Processing (user code)
  → Offset Commit
  → (Optional) Dead Letter Queue
```

**Monitoring Flow**:
```
Kafka Brokers
  → JMX Exporter (JVM metrics)
  → kafka_exporter (topic/consumer metrics)
  → Prometheus (scrape every 15s)
  → Grafana (dashboards, alerts)
```

**n8n Workflow Flow**:
```
Kafka Topic
  → n8n Kafka Trigger Node
  → n8n Workflow (transform, route, enrich)
  → External API (webhook, database, Slack)
```

### Security Architecture

**Authentication**:
- SASL/PLAINTEXT (basic username/password)
- SASL/SCRAM-SHA-256/512 (secure hashing)
- TLS client certificates (mutual TLS)
- OAuth/OIDC (Confluent Cloud)

**Encryption**:
- TLS 1.2+ for data in transit (broker ↔ client)
- Encryption at rest (cloud-managed platforms)

**Authorization**:
- Kafka ACLs (topic-level permissions)
- RBAC (Confluent Cloud)
- IAM roles (AWS MSK)
- Azure AD integration (Azure Event Hubs)

**Secrets Management**:
- Environment variables (12-factor app)
- `.env` files (local development)
- Terraform variables (production)
- Secrets rotation (manual or automated)

### Performance Targets

**NFR-001: Performance**:
- Plugin installation: < 30 seconds
- MCP server startup: < 5 seconds
- Local Kafka cluster startup: < 60 seconds
- Terraform apply (local): < 5 minutes
- Skill activation: < 1 second

**NFR-003: Scalability**:
- Kafka clusters: Up to 100 brokers
- Topics: Up to 1000 partitions per topic
- Consumer groups: Up to 100 consumers
- Multi-region deployments: Supported via Terraform

**Message Throughput** (benchmarks):
- Producer: 100K+ messages/sec (batching enabled)
- Consumer: 50K+ messages/sec (parallel processing)
- End-to-end latency: < 100ms (p95)

---

## Multi-Project Sync Architecture

**See**: [Multi-Project Sync Architecture Guide](../../../docs/public/guides/multi-project-sync-architecture.md)

SpecWeave's profile-based sync architecture enables **unlimited external repository connections** while maintaining `.specweave/` as the single source of truth. This architecture supports simultaneous synchronization with multiple GitHub repos, Jira projects, and Azure DevOps instances.

### Core Architecture: Three-Layer Design

The sync system uses a **layered separation of concerns** to isolate credentials, configuration, and per-increment tracking:

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Credentials (.env - gitignored)               │
│ ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐ │
│ │GITHUB_TOKEN │ │JIRA_API_TOKEN│ │AZURE_DEVOPS_PAT  │ │
│ └─────────────┘ └──────────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Sync Profiles (config.json - committed)       │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Profile: web-app │ │ Profile: api-svc │             │
│ │ GitHub: org/web  │ │ GitHub: org/api  │             │
│ │ TimeRange: 1M    │ │ TimeRange: 1M    │             │
│ │ RateLimit: 500   │ │ RateLimit: 500   │             │
│ └──────────────────┘ └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Per-Increment Metadata (metadata.json)        │
│ ┌──────────────────┐ ┌──────────────────┐             │
│ │ Increment 0035   │ │ Increment 0036   │             │
│ │ Profile: web-app │ │ Profile: api-svc │             │
│ │ Issue: #42       │ │ Issue: #55       │             │
│ │ URL: github.com..│ │ URL: github.com..│             │
│ └──────────────────┘ └──────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

**Layer Responsibilities**:

| Layer | Purpose | Location | Git | Secrets |
|-------|---------|----------|-----|---------|
| **1. Credentials** | API tokens | `.env` | ❌ Gitignored | ✅ Yes |
| **2. Profiles** | Repo configs, rate limits | `config.json` | ✅ Committed | ❌ No |
| **3. Metadata** | Per-increment tracking | `metadata.json` | ✅ Committed | ❌ No |

**Key Architectural Benefits**:
- ✅ **Security**: Credentials never committed to git
- ✅ **Reusability**: One profile used by multiple increments
- ✅ **Team Sharing**: Profiles are team-wide (config.json committed)
- ✅ **Flexibility**: Each increment can use different profile
- ✅ **Auditability**: Per-increment sync history preserved

### Profile Structure

**Configuration Example** (`.specweave/config.json`):

```json
{
  "sync": {
    "profiles": {
      "frontend-repo": {
        "provider": "github",
        "displayName": "Frontend Web App",
        "config": {
          "owner": "acme-corp",
          "repo": "ecommerce-web"
        },
        "timeRange": {
          "default": "1M",
          "max": "6M"
        },
        "rateLimits": {
          "maxItemsPerSync": 500,
          "warnThreshold": 100
        }
      },
      "backend-repo": {
        "provider": "github",
        "displayName": "Backend API",
        "config": {
          "owner": "acme-corp",
          "repo": "ecommerce-api"
        }
      },
      "product-jira": {
        "provider": "jira",
        "displayName": "Product - Jira",
        "config": {
          "domain": "acme.atlassian.net",
          "projectKey": "PROD"
        }
      }
    }
  }
}
```

**Profile Fields**:

| Field | Required | Purpose | Example |
|-------|----------|---------|---------|
| `provider` | ✅ Yes | External tool type | `"github"`, `"jira"`, `"ado"` |
| `displayName` | ✅ Yes | Human-readable label | `"Frontend Web App"` |
| `config` | ✅ Yes | Provider-specific params | `{"owner": "org", "repo": "app"}` |
| `timeRange.default` | ⚠️ Optional | Default sync window | `"1M"` (1 month) |
| `timeRange.max` | ⚠️ Optional | Maximum allowed range | `"6M"` (6 months) |
| `rateLimits.maxItemsPerSync` | ⚠️ Optional | Hard limit (abort if exceeded) | `500` |
| `rateLimits.warnThreshold` | ⚠️ Optional | Soft warning (prompt user) | `100` |

### Multi-Project Integration

Profiles integrate seamlessly with **multi-project mode** for team-based organization:

```json
{
  "multiProject": {
    "enabled": true,
    "activeProject": "frontend",
    "projects": [
      {
        "id": "frontend",
        "name": "Frontend Team",
        "keywords": ["react", "vue", "ui", "web"],
        "team": "Frontend Team",
        "syncProfiles": ["frontend-repo"]
      },
      {
        "id": "backend",
        "name": "Backend Team",
        "keywords": ["api", "node", "database"],
        "team": "Backend Team",
        "syncProfiles": ["backend-repo"]
      }
    ]
  },
  "sync": {
    "profiles": {
      "frontend-repo": { "provider": "github", ... },
      "backend-repo": { "provider": "github", ... }
    }
  }
}
```

**Smart Project Detection**:
```
User creates: "Add React dark mode toggle"
         ↓
Keyword Analysis: ["React", "dark mode", "toggle"]
         ↓
Project Scoring:
  - frontend: 0.95 (React keyword match)
  - backend: 0.1  (UI keyword weak match)
         ↓
Auto-Select: frontend project (confidence > 0.7)
         ↓
Use Profile: frontend-repo
         ↓
Sync to: acme-corp/ecommerce-web
```

**Detection Scoring**:
- Project name match: +10 points
- Team name match: +5 points
- Keyword match: +3 points per keyword
- Normalize to 0.0-1.0 scale
- Auto-select if confidence > 0.7

### Time Range Filtering

**Problem**: Syncing all historical data takes 25+ minutes and exhausts API rate limits.

**Solution**: Time range presets filter by creation date:

| Preset | Duration | Est. Items | API Calls | Sync Time | Impact |
|--------|----------|------------|-----------|-----------|--------|
| **1W** | 1 week | ~50 | 75 | 30 sec | Low ✅ |
| **1M** | 1 month | ~200 | 300 | 2 min | Medium ✅ |
| **3M** | 3 months | ~600 | 900 | 5 min | Medium ⚠️ |
| **6M** | 6 months | ~1,200 | 1,800 | 10 min | High ⚠️ |
| **ALL** | All time | ~5,000+ | 7,500+ | 30+ min | Critical ❌ |

**Recommendation**: Default to **1M (1 month)** for optimal balance (200 items, 2 min, safe).

**Usage**:
```bash
# Use default from profile (1M)
/specweave-github:sync 0035

# Override with specific range
/specweave-github:sync 0035 --time-range 1M

# Dry run (preview without executing)
/specweave-github:sync 0035 --dry-run
```

### Rate Limit Protection

SpecWeave provides **pre-flight validation** to prevent API rate limit exhaustion:

**Validation Steps**:
1. Estimate API calls based on time range
2. Query current rate limit remaining
3. Calculate impact level (LOW/MEDIUM/HIGH/CRITICAL)
4. Block CRITICAL operations, warn on HIGH

**Impact Levels**:

| Impact | API Calls | Status | Action |
|--------|-----------|--------|--------|
| **LOW** | < 250 | ✅ Safe | Proceed |
| **MEDIUM** | 250-1,000 | ⚠️ Warning | Confirm |
| **HIGH** | 1,000-2,500 | ⚠️ Risky | Strong warning |
| **CRITICAL** | 2,500+ | ❌ Block | Reduce time range |

**Example - Critical Impact Blocked**:
```bash
/specweave-github:sync 0035 --time-range ALL

# Output:
❌ This sync may FAIL due to:

Blockers:
  • CRITICAL rate limit impact: 7,500 API calls exceeds safe threshold
  • Not enough rate limit remaining (need 7,500, only 4,850 remaining)

Recommendations:
  1. Reduce time range to 1 month (~300 API calls, SAFE)
  2. Wait for rate limit reset (25 minutes)
  3. Split sync across multiple time periods
```

**Provider Rate Limits**:

| Provider | Limit | Reset | Notes |
|----------|-------|-------|-------|
| **GitHub** | 5,000/hour | Hourly | Authenticated API |
| **Jira** | 100/min | Per minute | Cloud API |
| **Azure DevOps** | 200/5min | Per 5 minutes | REST API |

### Real-World Scenarios

**Scenario 1: Single Project → Multiple Repos**

*Use Case*: E-commerce monorepo syncing to Frontend, Backend, Mobile repos

```
.specweave/ (Single local project)
    ↓
Profiles: frontend-repo, backend-repo, mobile-repo
    ↓
External: org/web, org/api, org/mobile
```

**Scenario 2: Multi-Project Mode**

*Use Case*: Platform team managing Internal Tools, Customer Portal, Admin Dashboard

```
Projects: internal-tools, customer-portal, admin-dashboard
    ↓
Each project has dedicated sync profile(s)
    ↓
External: platform/tools, platform/portal, platform/admin
```

**Scenario 3: Mixed External Tools**

*Use Case*: Engineering uses GitHub, Product uses Jira, Ops uses Azure DevOps

```
.specweave/
    ↓
Profiles: eng-github, product-jira, ops-ado
    ↓
External: GitHub Issues, Jira Epics, ADO Work Items
```

**Scenario 4: Multi-Client Consulting**

*Use Case*: Agency managing Client A, Client B, Client C projects

```
Projects: client-a, client-b, client-c
    ↓
Per-client profiles with isolated credentials
    ↓
External: client-a/repo, client-b/repo, client-c/repo
```

### Sync Workflow Commands

```bash
# Create new profile
/specweave:sync-profile create

# List all profiles
/specweave:sync-profile list

# Sync increment to GitHub
/specweave-github:sync 0035

# Sync to Jira
/specweave-jira:sync 0035

# Sync to Azure DevOps
/specweave-ado:sync 0035

# Switch project (multi-project mode)
/specweave:switch-project frontend
```

**Auto-Sync Hooks**:
- `post-task-completion.sh` - Syncs task checkbox updates to external issues
- `post-increment-done.sh` - Closes external issue when increment completes
- `pre-spec-sync.sh` - Validates profile before sync

### Data Flow: Complete Sync Lifecycle

```
1. User creates increment
   ↓
2. Select or auto-detect profile (frontend-repo)
   ↓
3. Load profile config (owner: "org", repo: "web")
   ↓
4. Select time range (default: 1M)
   ↓
5. Pre-flight validation (check rate limits)
   ↓
6. Execute sync (create GitHub issue)
   ↓
7. Save metadata (profile, issueNumber, url)
   ↓
8. Bidirectional sync enabled (hooks track updates)
```

### Configuration Patterns

**Pattern 1: Minimal** (Simple project, one repo)
```json
{
  "sync": {
    "profiles": {
      "default": {
        "provider": "github",
        "config": { "owner": "org", "repo": "app" }
      }
    }
  }
}
```

**Pattern 2: Multi-Repo** (FE, BE, Mobile)
```json
{
  "sync": {
    "profiles": {
      "frontend": { "provider": "github", ... },
      "backend": { "provider": "github", ... },
      "mobile": { "provider": "github", ... }
    }
  }
}
```

**Pattern 3: Multi-Project + Multi-Repo** (Enterprise)
```json
{
  "multiProject": { "enabled": true, "projects": [...] },
  "sync": {
    "profiles": {
      "team-a-github": { ... },
      "team-a-jira": { ... },
      "team-b-github": { ... }
    }
  }
}
```

### Best Practices

1. **Profile Naming**: Use descriptive names (`frontend-github`, `client-a-jira`)
2. **Time Ranges**: Default to `1M` for active projects, `3M` for brownfield
3. **Rate Limits**: Conservative for shared accounts (`maxItemsPerSync: 200`)
4. **Credentials**: Always use `.env`, never hardcode in `config.json`
5. **Multi-Project**: Organize by team or repo, not by feature

### References

- **User Guide**: [Multi-Project Sync Architecture](../../../docs/public/guides/multi-project-sync-architecture.md)
- **Glossary**: [Profile-Based Sync](../../../docs/public/glossary/terms/profile-based-sync.md)
- **Setup Guide**: [Multi-Project Setup](../../../docs/public/guides/multi-project-setup.md)
- **Commands**: `/specweave-github:sync`, `/specweave-jira:sync`, `/specweave-ado:sync`

---

## Living Documentation System

**See**: [Intelligent Living Docs Guide](../../../docs/public/guides/intelligent-living-docs-sync.md)

**Two Modes**:

1. **Simple Mode**: Single file per increment spec
   - `docs/internal/specs/spec-0035-kafka-plugin.md`

2. **Intelligent Mode**: Parse, classify, distribute by category + project
   - `docs/internal/specs/{project}/us-001-*.md` (User Stories)
   - `docs/internal/architecture/adr/0035-*.md` (ADRs)
   - `docs/internal/operations/runbook-*.md` (Runbooks)
   - `docs/internal/delivery/test-strategy-*.md` (Test Strategies)

**Classification System** (9 categories):
- User Story, NFR, Architecture, ADR, Operations, Delivery, Strategy, Governance, Overview

**Bidirectional Linking**:
- User Story → Tasks (forward links)
- Tasks → User Story (reverse links, auto-injected)

**Docusaurus Frontmatter**:
```yaml
---
id: us-001-mcp-integration
title: "US-001: MCP Kafka Server Integration"
project: "default"
category: "user-story"
tags: ["kafka", "mcp", "integration"]
---
```

---

## Serverless Architecture Intelligence

**Status**: Planning (v0.22.0)
**Increment**: [0038-serverless-architecture-intelligence](../../increments/0038-serverless-architecture-intelligence/)

### Overview

Serverless Architecture Intelligence enhances SpecWeave's Architect and Infrastructure agents with deep serverless platform awareness, context-aware recommendations, and Infrastructure-as-Code (IaC) generation capabilities.

**Key Capabilities**:
- Context-aware serverless recommendations (pet project vs startup vs enterprise)
- Platform comparison matrix (AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase)
- Free tier and startup credit intelligence
- IaC pattern library (Terraform templates for all platforms)
- Cost estimation and optimization
- Security and compliance guidance

### Architecture Pattern: Skill-Based Knowledge Injection

Instead of bloating Architect/Infrastructure agents with serverless knowledge, we use **auto-activating skills** that inject knowledge when needed.

```
User asks about serverless
         ↓
Claude Code activates:
  1. architect agent (architecture question)
  2. serverless-recommender skill (serverless keywords detected)
         ↓
Skill analyzes context → Recommends platform
         ↓
Architect Agent receives recommendation → Creates architecture + ADR
         ↓
Infrastructure Agent receives architecture
         ↓
serverless-iac-generator skill activates → Generates Terraform
```

**Benefits**:
- **Context Efficiency**: Agents stay small (~600 lines), skills activate only when needed
- **Modularity**: Serverless knowledge is optional (can be uninstalled)
- **Reusability**: Multiple agents can use same skills
- **Maintainability**: Single source of truth (knowledge base)

### Components

#### 1. Knowledge Base (JSON Files)

**Location**: `plugins/specweave/knowledge-base/serverless/platforms/`

**Structure**:
```
platforms/
├── aws-lambda.json       # AWS Lambda data
├── azure-functions.json  # Azure Functions data
├── gcp-functions.json    # GCP Cloud Functions data
├── firebase.json         # Firebase data
└── supabase.json         # Supabase data
```

**Data Model**: Each platform JSON includes:
- Pricing (free tier, pay-as-you-go, startup credits)
- Features (runtimes, max duration, cold starts, concurrency)
- Ecosystem (integrations, SDKs, community size)
- Vendor lock-in risk (portability, migration complexity)
- Suitability (pet projects, startups, enterprise)

**Reference**: [ADR-0038: Serverless Platform Knowledge Base](adr/0038-serverless-platform-knowledge-base.md)

#### 2. Context Detector (TypeScript Module)

**Location**: `src/core/serverless/context-detector.ts`

**Purpose**: Automatically detect project context (pet project, startup, enterprise) from:
- User input keywords ("learning", "MVP", "compliance")
- Project metadata (team size, expected traffic, budget)
- Codebase analysis (dependency count, security packages)

**Algorithm**: Multi-signal heuristic-based detection with confidence scoring.

**Output**:
```typescript
{
  context: 'pet-project' | 'startup' | 'enterprise',
  confidence: 'high' | 'medium' | 'low',
  signals: ['Keyword signal: pet-project', 'Team size: 1 developer'],
  clarifyingQuestions?: ['What is your team size?', ...]
}
```

**Reference**: [ADR-0039: Context Detection Strategy](adr/0039-context-detection-strategy.md)

#### 3. IaC Template Engine (Handlebars)

**Location**: `plugins/specweave/templates/iac/`

**Structure**:
```
iac/
├── aws-lambda/
│   ├── templates/
│   │   ├── main.tf.hbs           # Lambda + API Gateway + DynamoDB
│   │   ├── variables.tf.hbs
│   │   ├── outputs.tf.hbs
│   │   ├── providers.tf.hbs
│   │   └── iam.tf.hbs
│   ├── defaults.json             # Context-specific defaults
│   └── schema.json               # Variable schema
├── azure-functions/
├── gcp-cloud-functions/
├── firebase/
└── supabase/
```

**Generation Process**:
1. Load Handlebars template
2. Load defaults for platform + context (pet-project/startup/enterprise)
3. Merge with user custom variables
4. Render Terraform files
5. Generate environment-specific tfvars (dev/staging/prod)
6. Create deployment README

**Reference**: [ADR-0040: IaC Template Engine](adr/0040-iac-template-engine.md)

#### 4. Cost Estimator (TypeScript Module)

**Location**: `src/core/serverless/cost-estimator.ts`

**Purpose**: Estimate monthly serverless costs based on:
- Expected traffic (requests/month)
- Average execution duration (ms)
- Memory allocation (MB)
- Data transfer (GB)
- Storage (GB)

**Algorithm**: Tier-based calculation with free tier deductions:
```typescript
Cost = (Compute Cost) + (Request Cost) + (Data Transfer) + (Storage)
       - (Free Tier Savings)

Compute Cost = GB-seconds × $0.0000166667
GB-seconds = (Memory in GB) × (Duration in seconds) × (Request count)
```

**Output**:
```typescript
{
  monthlyTotal: 82.47,
  breakdown: { compute: 41.67, requests: 1.00, dataTransfer: 9.00, storage: 30.80 },
  freeTierSavings: 6.87,
  withinFreeTier: false,
  creditRunway: 12.1,  // months (if startup credits)
  recommendations: [
    "Your $100K credits will last ~12 months",
    "Consider reserved capacity for 20-30% savings"
  ]
}
```

**Reference**: [ADR-0041: Cost Estimation Algorithm](adr/0041-cost-estimation-algorithm.md)

#### 5. Skills (Auto-Activating Capabilities)

**Location**: `plugins/specweave/skills/`

**Skills**:
- `serverless-recommender`: Context detection + platform recommendations (US-001)
- `serverless-iac-generator`: Terraform template generation (US-005)
- `serverless-cost-estimator`: Cost estimation and optimization (US-006)
- `serverless-security`: Security best practices (US-010)

**Activation**: Claude Code auto-activates skills based on keywords in user input.

**Example**:
```yaml
---
name: serverless-recommender
description: Provides context-aware serverless recommendations for AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase. Activates when users ask about serverless deployment, cloud functions, pet project deployment, startup infrastructure.
---
```

**Reference**: [ADR-0042: Agent Enhancement Pattern](adr/0042-agent-enhancement-pattern.md)

### Data Flow

#### Recommendation Flow
```
User: "Should I use serverless for my pet project?"
  ↓
serverless-recommender skill activates
  ↓
Context Detector: Analyzes input → Detects "pet-project" (high confidence)
  ↓
Platform Ranker: Reads knowledge base → Scores platforms
  ↓
Top Platform: Firebase (free tier, beginner-friendly, batteries-included)
  ↓
Cost Estimator: Estimates cost → $0/month (within free tier)
  ↓
Recommendation: "Firebase is excellent for pet projects (free tier, easy setup)"
  ↓
Architect Agent: Creates ADR documenting decision
```

#### IaC Generation Flow
```
Architect Agent: Recommends AWS Lambda architecture
  ↓
User: "Generate Terraform for this"
  ↓
serverless-iac-generator skill activates
  ↓
Template Loader: Loads aws-lambda/templates/*.hbs
  ↓
Variable Resolver: Merges defaults (pet-project) + custom variables
  ↓
Handlebars Compiler: Renders main.tf, variables.tf, outputs.tf
  ↓
Tfvars Generator: Creates dev.tfvars, staging.tfvars, prod.tfvars
  ↓
README Generator: Creates deployment guide
  ↓
File Writer: Writes to infrastructure/ directory
  ↓
User: Runs `terraform apply` to deploy
```

### Platform Coverage

| Platform | Category | Free Tier | Startup Credits | Suitability |
|----------|----------|-----------|----------------|-------------|
| **AWS Lambda** | Compute (FaaS) | Perpetual (400K GB-seconds, 1M requests/month) | AWS Activate ($1K-$100K, 1-2 years) | Pet: Excellent, Startup: Excellent, Enterprise: Excellent |
| **Azure Functions** | Compute (FaaS) | Perpetual (400K GB-seconds, 1M requests/month) | Microsoft for Startups ($150K, 2 years) | Pet: Excellent, Startup: Excellent, Enterprise: Excellent |
| **GCP Cloud Functions** | Compute (FaaS) | Perpetual (400K GB-seconds, 2M requests/month) | Google for Startups ($200K, 1 year) | Pet: Excellent, Startup: Excellent, Enterprise: Good |
| **Firebase** | Backend-as-a-Service | Perpetual (125K functions/month, 1GB storage, 10GB transfer) | GCP credits via Google for Startups | Pet: Excellent, Startup: Good, Enterprise: Fair |
| **Supabase** | Backend-as-a-Service | Perpetual (500MB database, 1GB file storage, 2GB transfer) | Pro plan free trials | Pet: Excellent, Startup: Good, Enterprise: Fair |

### Integration with Existing Agents

**Architect Agent Enhancement**:
- NO code bloat (agent stays ~600 lines)
- References serverless skills in documentation
- Uses skill recommendations in architecture design
- Documents serverless decisions in ADRs

**Infrastructure Agent Enhancement**:
- NO code bloat (agent stays ~400 lines)
- References serverless-iac-generator skill
- Generates Terraform using skill templates
- Includes deployment instructions

### Architecture Diagrams

**C4 Level 1 (System Context)**:
```
Developer → SpecWeave Serverless Intelligence → Cloud Providers (AWS, Azure, GCP, Firebase, Supabase)
```
[View Diagram](diagrams/serverless-intelligence/system-context.mmd)

**C4 Level 2 (Containers)**:
```
Architect Agent → serverless-recommender skill → Knowledge Base
Infrastructure Agent → serverless-iac-generator skill → Template Library
```
[View Diagram](diagrams/serverless-intelligence/system-container.mmd)

**C4 Level 3 (Components)**:
```
Context Detector → Platform Ranker → Cost Estimator → Recommendation Formatter
Template Loader → Variable Resolver → Handlebars Compiler → File Writer
```
[View Diagram](diagrams/serverless-intelligence/component-diagram.mmd)

### Testing Strategy

**Unit Tests**:
- Context detection logic (95%+ coverage)
- Platform ranking algorithm
- Cost estimation calculations
- Terraform template rendering

**Integration Tests**:
- Architect agent + serverless-recommender skill collaboration
- Infrastructure agent + IaC generation workflow
- End-to-end recommendation flow

**E2E Tests**:
- Deploy generated Terraform to test AWS/Azure/GCP accounts
- Validate free tier configurations (no charges incurred)
- Test full user workflow (question → recommendation → IaC → deploy)

### Performance Targets

- Context detection: < 200ms
- Platform comparison: < 100ms
- Cost estimation: < 500ms
- IaC generation: < 2 seconds (complete Terraform setup)

### Maintenance

**Weekly Tasks**:
- Check cloud provider pricing pages for changes
- Validate free tier limits (AWS, Azure, GCP, Firebase, Supabase)
- Review startup credit programs (eligibility, amounts, duration)

**Monthly Tasks**:
- E2E test: Deploy templates to test accounts
- Update platform data (features, runtimes, max duration)
- Review community contributions (template updates)

**Automated Checks**:
- GitHub Action: Validate platform JSONs against schema
- GitHub Action: Check for stale data (> 60 days old)
- Pre-commit hook: Terraform validation (`terraform validate`)

### Related Documentation

**Architecture Decisions**:
- [ADR-0038: Serverless Platform Knowledge Base](adr/0038-serverless-platform-knowledge-base.md)
- [ADR-0039: Context Detection Strategy](adr/0039-context-detection-strategy.md)
- [ADR-0040: IaC Template Engine](adr/0040-iac-template-engine.md)
- [ADR-0041: Cost Estimation Algorithm](adr/0041-cost-estimation-algorithm.md)
- [ADR-0042: Agent Enhancement Pattern](adr/0042-agent-enhancement-pattern.md)

**Living Specs**:
- [FS-038: Serverless Architecture Intelligence](../../specs/_features/FS-038/FEATURE.md)

**User Stories**:
- [US-001: Context-Aware Serverless Recommendations](../../specs/specweave/FS-038/us-001-context-aware-serverless-recommendations.md)
- [US-005: IaC Pattern Library - Terraform](../../specs/specweave/FS-038/us-005-iac-pattern-library-terraform.md)
- [US-007: Architect Agent Enhancement](../../specs/specweave/FS-038/us-007-architect-agent-enhancement.md)
- [US-008: Infrastructure Agent IaC Generation](../../specs/specweave/FS-038/us-008-infrastructure-agent-iac-generation.md)

---

## Security Architecture

**Authentication**:
- GitHub: Personal Access Token (PAT) or GitHub App
- JIRA: API Token
- Azure DevOps: Personal Access Token
- Kafka: SASL/SCRAM, TLS, OAuth

**Secrets Management**:
- Environment variables (`.env` files)
- Never commit secrets to git
- Use `.gitignore` for sensitive files

**Audit Trail**:
- All sync operations logged
- Increment metadata tracks external links
- Living docs sync creates audit trail

**Compliance**:
- GDPR: No PII stored in framework (user controls data)
- SOC 2: Framework supports audit requirements (versioned specs, traceability)

---

## Performance & Scalability

**Core Framework**:
- Status line render: < 1ms
- Increment creation: < 5 seconds
- Living docs sync: < 10 seconds

**External Sync**:
- GitHub issue creation: < 2 seconds
- JIRA sync: < 3 seconds
- Batch sync (100 increments): < 5 minutes

**Context Window Usage**:
- Core plugin: ~12K tokens (75% reduction vs v0.3.7)
- Average plugin: 4-8K tokens
- All plugins installed: Only pay for active skills

**Scalability Limits**:
- Increments: No hard limit (tested up to 1000+)
- Living docs: No hard limit (Markdown files scale linearly)
- External sync: Rate limited by external APIs (GitHub: 5000 req/hr)

---

## Deployment Architecture

**Installation Methods**:

1. **NPM** (Global):
   ```bash
   npm install -g specweave
   specweave init .
   ```

2. **Install Script**:
   ```bash
   curl -fsSL https://spec-weave.com/install.sh | bash
   ```

3. **Manual** (Contributors):
   ```bash
   git clone https://github.com/anton-abyzov/specweave.git
   npm install && npm run build
   npm link  # Global installation
   ```

**Plugin Marketplace** (Global Registration):
```bash
# Automatic (via specweave init)
claude plugin marketplace add anton-abyzov/specweave
claude plugin install specweave
claude plugin install specweave-github
claude plugin install specweave-kafka
# ... (all 19+ plugins installed)

# Manual (if needed)
/plugin install specweave
/plugin install specweave-kafka
```

**Multi-Repo Setup**:
- GitHub parent folder (teams)
- Local parent folder (solo developers)
- Per-repo (not recommended, duplication)

**See**: [Multi-Repo Setup Guide](https://spec-weave.com/docs/learn/multi-repo-setup)

---

## Future Architecture Considerations

### Short-Term (v1.0)

- **GitHub Actions Integration**: Auto-run tests on increment completion
- **Kafka Streams DSL Generator**: AI-generated stream processing code
- **MCP Server Registry**: Auto-discover MCP servers in organization
- **Grafana Dashboard Generator**: Auto-generate dashboards from Kafka topology

### Mid-Term (v2.0)

- **Multi-Cloud Kafka Federation**: Cross-cloud topic replication
- **AI-Driven Capacity Planning**: ML-based cluster sizing
- **Schema Evolution Automation**: Auto-migrate schemas with compatibility checks
- **n8n Workflow Marketplace**: Community-contributed Kafka workflows

### Long-Term (v3.0+)

- **Kafka Event Sourcing Framework**: Built-in event sourcing patterns
- **Real-Time Data Mesh**: Decentralized Kafka topology management
- **AI Kafka SRE**: Autonomous incident detection and remediation
- **Kafka Compliance Toolkit**: GDPR, SOC 2, HIPAA compliance automation

---

## Related Documentation

**Architecture Decisions**:
- [ADR-0035: Kafka Multi-Plugin Architecture](adr/0035-kafka-multi-plugin-architecture.md)
- [ADR-0036: Kafka MCP Server Selection](adr/0036-kafka-mcp-server-selection.md)
- [ADR-0037: Kafka Terraform Provider Strategy](adr/0037-kafka-terraform-provider-strategy.md)
- [ADR-0038: Kafka Monitoring Stack Selection](adr/0038-kafka-monitoring-stack-selection.md)
- [ADR-0039: n8n Kafka Integration Approach](adr/0039-n8n-kafka-integration-approach.md)

**User Guides**:
- [Kafka Quick Start](../../../docs/public/guides/kafka-quick-start.md) (To be created)
- [Multi-Project Sync](https://spec-weave.com/docs/integrations/multi-project-sync)
- [Intelligent Living Docs](../../../docs/public/guides/intelligent-living-docs-sync.md)

**Living Specs**:
- [SPEC-035: Kafka Event Streaming Integration Plugin](../../specs/default/spec-035-kafka-plugin.md)

---

**Document History**:
- v2.1 (2025-11-16): Added Serverless Architecture Intelligence
- v2.0 (2025-11-15): Added Kafka Event Streaming Plugin Suite architecture
- v1.0 (2025-10-01): Initial system design document
