# SpecWeave Architecture Overview

**Version**: 0.26.x
**Last Updated**: 2025-11-24

This document provides a comprehensive architectural overview of SpecWeave, including all major subsystems, flows, and integrations.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Init Flow (Strategic Init)](#2-init-flow-strategic-init)
3. [Increment Lifecycle](#3-increment-lifecycle)
4. [Hook System](#4-hook-system)
5. [Agent Orchestration](#5-agent-orchestration)
6. [External Tool Sync](#6-external-tool-sync)
7. [Plugin Architecture](#7-plugin-architecture)
8. [Directory Structure](#8-directory-structure)

---

## 1. System Overview

```mermaid
graph TB
    subgraph "User Interface"
        CLI[specweave CLI]
        CC[Claude Code]
        Commands[Slash Commands]
    end

    subgraph "Core Engine"
        Init[Strategic Init]
        Inc[Increment Manager]
        Sync[Sync Engine]
        Hooks[Hook System]
    end

    subgraph "AI Agents"
        PM[PM Agent]
        Arch[Architect Agent]
        TL[Tech Lead Agent]
        QA[QA Agent]
    end

    subgraph "External Tools"
        GH[GitHub Issues]
        JIRA[JIRA]
        ADO[Azure DevOps]
    end

    subgraph "Storage"
        FS[.specweave/]
        Git[Git Repository]
    end

    CLI --> Init
    CC --> Commands
    Commands --> Inc
    Inc --> PM
    PM --> Arch
    Arch --> TL
    TL --> Inc
    Inc --> Hooks
    Hooks --> Sync
    Sync --> GH
    Sync --> JIRA
    Sync --> ADO
    Inc --> FS
    Sync --> FS
```

---

## 2. Init Flow (Strategic Init)

The `specweave init` command runs a 6-phase research flow to configure projects optimally.

### 2.1 Phase Diagram

```mermaid
sequenceDiagram
    participant User
    participant CLI as specweave CLI
    participant VA as Vision Analyzer
    participant CD as Compliance Detector
    participant TR as Team Recommender
    participant AE as Architecture Engine
    participant FS as .specweave/

    User->>CLI: specweave init .

    rect rgb(230, 245, 255)
        Note over CLI,VA: Phase 1: Vision & Market
        CLI->>User: Describe your product
        User->>CLI: "Event management SaaS"
        CLI->>VA: Analyze vision
        VA-->>CLI: Market, competitors, opportunity score
    end

    rect rgb(255, 243, 224)
        Note over CLI,User: Phase 2: Scaling
        CLI->>User: Expected users?
        User->>CLI: 100K users
        CLI->>User: Number of services?
        User->>CLI: 5 microservices
    end

    rect rgb(232, 245, 233)
        Note over CLI,CD: Phase 3: Compliance
        CLI->>User: Data types handled?
        User->>CLI: Healthcare, personal
        CLI->>CD: Detect requirements
        CD-->>CLI: HIPAA, SOC2 detected
    end

    rect rgb(243, 229, 245)
        Note over CLI,User: Phase 4: Budget
        CLI->>User: Budget tier?
        User->>CLI: Pre-seed
        CLI-->>User: AWS Activate eligible
    end

    rect rgb(255, 236, 179)
        Note over CLI,User: Phase 5: Methodology
        CLI->>User: Agile or Waterfall?
        User->>CLI: Agile
    end

    rect rgb(252, 228, 236)
        Note over CLI,User: Phase 6: Repositories
        CLI->>User: Multi-repo setup?
        User->>CLI: Yes, 3 repos
        CLI->>User: Select repos
    end

    CLI->>AE: Generate recommendations
    AE-->>CLI: Architecture + team + cost
    CLI->>FS: Write config.json
    CLI->>FS: Create directory structure
    CLI-->>User: Init complete
```

### 2.2 Components

| Component | Location | Purpose |
|-----------|----------|---------|
| VisionAnalyzer | `src/init/research/VisionAnalyzer.ts` | Market research, competitor analysis |
| ComplianceDetector | `src/init/compliance/ComplianceDetector.ts` | Auto-detect 30+ standards |
| TeamRecommender | `src/init/team/TeamRecommender.ts` | Team sizing recommendations |
| ArchitectureDecisionEngine | `src/init/architecture/ArchitectureDecisionEngine.ts` | Tech stack decisions |
| RepositorySelector | `src/init/repo/RepositorySelector.ts` | Multi-repo selection |

### 2.3 Output Structure

```
.specweave/
├── config.json           # Generated configuration
├── .env                  # Secrets (gitignored)
├── increments/           # Work packages
├── docs/
│   ├── internal/         # Living documentation
│   └── public/           # Published docs
├── state/                # Runtime state
├── cache/                # Temporary cache (24h TTL)
└── metrics/              # DORA metrics
```

---

## 3. Increment Lifecycle

### 3.1 State Machine

```mermaid
stateDiagram-v2
    [*] --> Planning: /specweave:increment

    Planning --> Active: spec.md + plan.md + tasks.md created

    Active --> InProgress: /specweave:do

    InProgress --> InProgress: Task completion
    InProgress --> Testing: All tasks complete

    Testing --> Done: /specweave:done (gates pass)
    Testing --> InProgress: Gates fail

    Done --> Archived: Auto-archive
    Archived --> [*]

    Active --> Paused: /specweave:pause
    Paused --> Active: /specweave:resume

    Active --> Abandoned: /specweave:abandon
    InProgress --> Abandoned: /specweave:abandon
    Abandoned --> [*]

    Active --> Backlog: /specweave:backlog
    Backlog --> Active: /specweave:resume

    Done --> Reopened: /specweave:reopen
    Reopened --> InProgress: Continue work
```

### 3.2 Three-File Structure

```
.specweave/increments/_archive/0001-user-authentication/
├── spec.md       # WHAT: User stories, acceptance criteria
├── plan.md       # HOW: Architecture, implementation approach
├── tasks.md      # DO: Task checklist with embedded tests
└── metadata.json # State: Status, sync info, timestamps
```

### 3.3 WIP Limits

```mermaid
graph TD
    A[0 Active] -->|Create OK| B[1 Active]
    B -->|Warn but allow| C[2 Active]
    C -->|HARD BLOCK| D[Cannot create]

    B -->|Complete/Abandon| A
    C -->|Complete/Abandon| B

    style A fill:#51cf66
    style B fill:#ffd43b
    style C fill:#ff8787
    style D fill:#ff6b6b
```

---

## 4. Hook System

### 4.1 Hook Execution Flow

```mermaid
sequenceDiagram
    participant User
    participant Claude as Claude Code
    participant Todo as TodoWrite Tool
    participant Hook as Hook System
    participant Sync as Sync Scripts
    participant Ext as External Tools

    User->>Claude: Complete task T-005
    Claude->>Todo: Mark [x] T-005
    Todo-->>Claude: Task marked

    Claude->>Hook: post-task-completion.sh

    rect rgb(230, 245, 255)
        Note over Hook: Debounce (15s wait)
        Hook->>Hook: Check for more completions
    end

    Hook->>Sync: sync-living-docs.ts
    Sync->>Sync: Copy spec to living docs
    Sync->>Sync: Update cross-links
    Sync-->>Hook: Docs synced

    alt External sync enabled
        Hook->>Ext: Update GitHub issue
        Ext-->>Hook: Checkbox updated
    end

    Hook->>Hook: Update status cache
    Hook->>Hook: Play completion sound
    Hook-->>Claude: Hook complete
    Claude-->>User: Task complete
```

### 4.2 Available Hooks

| Hook | Trigger | Actions |
|------|---------|---------|
| `post-increment-planning` | `/specweave:increment` | Translate files, create GitHub issue |
| `post-task-completion` | Task marked complete | Sync docs, update external, play sound |
| `post-increment-done` | `/specweave:done` | Final sync, close issue, archive |
| `pre-implementation` | `/specweave:do` | Validate environment |

### 4.3 Hook Configuration

```json
{
  "hooks": {
    "post_task_completion": {
      "sync_living_docs": true,
      "sync_tasks_md": true,
      "external_tracker_sync": true
    },
    "post_increment_planning": {
      "auto_create_github_issue": true
    },
    "post_increment_done": {
      "close_github_issue": true,
      "update_living_docs_first": true
    }
  }
}
```

---

## 5. Agent Orchestration

### 5.1 Orchestrator Pattern

```mermaid
graph TB
    subgraph "User Request"
        REQ["Build SaaS for events"]
    end

    subgraph "Role Orchestrator"
        ORCH[Orchestrator Skill]
    end

    subgraph "Strategic Layer"
        PM[PM Agent<br/>User stories, strategy]
        ARCH[Architect Agent<br/>System design, ADRs]
    end

    subgraph "Execution Layer"
        TL[Tech Lead Agent<br/>Implementation plan]
        BE[Backend Agent<br/>Server code]
        FE[Frontend Agent<br/>UI code]
    end

    subgraph "Quality Layer"
        QA[QA Lead Agent<br/>Test strategy]
        SEC[Security Agent<br/>Threat modeling]
        DEV[DevOps Agent<br/>Infrastructure]
    end

    subgraph "Quality Gates"
        G1[Gate 1: Requirements]
        G2[Gate 2: Design]
        G3[Gate 3: Implementation]
        G4[Gate 4: Deployment]
    end

    REQ --> ORCH
    ORCH --> PM
    PM --> G1
    G1 -->|Pass| ARCH
    ARCH --> G2
    G2 -->|Pass| TL
    TL --> BE
    TL --> FE
    BE --> G3
    FE --> G3
    G3 -->|Pass| QA
    QA --> SEC
    SEC --> G4
    G4 -->|Pass| DEV
```

### 5.2 Skills vs Agents

```mermaid
graph LR
    subgraph "Skills (Auto-activate)"
        S1[increment-planner]
        S2[brownfield-analyzer]
        S3[tdd-workflow]
    end

    subgraph "Agents (Explicit Task)"
        A1[PM Agent]
        A2[Architect Agent]
        A3[Tech Lead Agent]
    end

    U[User Query] -->|Keywords match| S1
    U -->|Keywords match| S2

    CMD[/specweave:increment] -->|Spawns| A1
    A1 -->|Complete| A2
    A2 -->|Complete| A3
```

---

## 6. External Tool Sync

### 6.1 Three-Permission Architecture (v0.24.0+)

```mermaid
graph TB
    subgraph "Permission Questions"
        Q1[Q1: Can Claude CREATE<br/>and UPDATE internal items?]
        Q2[Q2: Can Claude UPDATE<br/>external items?]
        Q3[Q3: Can Claude UPDATE<br/>status?]
    end

    subgraph "Sync Operations"
        CREATE[Create GitHub Issue]
        UPDATE_INT[Update Own Issues]
        UPDATE_EXT[Update PM Issues]
        SYNC_STATUS[Sync Status]
    end

    Q1 -->|Yes| CREATE
    Q1 -->|Yes| UPDATE_INT
    Q2 -->|Yes| UPDATE_EXT
    Q3 -->|Yes| SYNC_STATUS
```

### 6.2 Three-Layer Sync

```mermaid
graph TB
    subgraph "Layer 1: External Tool"
        GH[GitHub Issue<br/>Stakeholder UI]
    end

    subgraph "Layer 2: Living Docs"
        LD[Living Docs User Story<br/>Project-specific]
    end

    subgraph "Layer 3: Increment"
        INC[spec.md + tasks.md<br/>SOURCE OF TRUTH]
    end

    INC -->|Copy filtered| LD
    LD -->|Sync| GH

    GH -.->|Status sync| LD
    LD -.->|Status sync| INC
```

### 6.3 Supported Platforms

| Platform | Status | Features |
|----------|--------|----------|
| GitHub Issues | Production | Full sync, multi-repo, profiles |
| JIRA | Production | Epic/Story hierarchy, sprints |
| Azure DevOps | Production | Work items, area paths |
| Linear | Q1 2026 | Planned |

---

## 7. Plugin Architecture

### 7.1 Plugin Structure

```
plugins/
├── specweave/                 # Core plugin (always loaded)
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── skills/                # Auto-activating
│   ├── agents/                # Explicit Task()
│   ├── commands/              # Slash commands
│   └── hooks/                 # Lifecycle hooks
│
├── specweave-github/          # GitHub integration
├── specweave-jira/            # JIRA integration
├── specweave-ado/             # Azure DevOps
├── specweave-ml/              # Machine learning
├── specweave-infrastructure/  # DevOps/SRE
├── specweave-kafka/           # Kafka streaming
├── specweave-release/         # Release management
└── ...                        # 19+ plugins total
```

### 7.2 Context Loading

```mermaid
graph TD
    A[User Query] --> B{Skill Match?}

    B -->|Yes| C[Load Matching Skill<br/>2-5K tokens]
    B -->|No| D[No skill loaded]

    C --> E{Agent Needed?}
    D --> E

    E -->|Yes| F[Spawn Agent<br/>Isolated context]
    E -->|No| G[Respond directly]

    F --> H[Agent executes<br/>10-50K tokens]
    H --> I[Return report]
```

---

## 8. Directory Structure

### 8.1 Project Root

```
your-project/
├── .specweave/                # SpecWeave data (gitignored selectively)
├── .claude-plugin/            # Plugin marketplace link
├── CLAUDE.md                  # Claude Code instructions
├── src/                       # Your source code
└── ...
```

### 8.2 .specweave Directory

```
.specweave/
├── config.json                # Configuration (committed)
├── .env                       # Secrets (gitignored)
│
├── increments/                # Work packages
│   ├── 0001-feature-name/
│   │   ├── spec.md
│   │   ├── plan.md
│   │   ├── tasks.md
│   │   └── metadata.json
│   ├── _archive/              # Completed increments
│   └── README.md
│
├── docs/
│   ├── internal/              # Living documentation
│   │   ├── architecture/
│   │   │   └── adr/           # Decision records
│   │   ├── specs/
│   │   │   ├── backend/
│   │   │   ├── frontend/
│   │   │   └── mobile/
│   │   ├── operations/
│   │   ├── delivery/
│   │   └── governance/
│   └── public/                # Published docs
│       └── glossary/
│
├── state/                     # Runtime state
│   ├── status-cache.json
│   └── .hook-*
│
├── cache/                     # Temporary (24h TTL)
└── metrics/                   # DORA metrics
    ├── dora-latest.json
    └── dora-report.md
```

---

## Summary

SpecWeave's architecture is built around:

1. **Strategic Init** - 6-phase research-driven project setup
2. **Increment Lifecycle** - Disciplined spec → plan → tasks → done workflow
3. **Hook System** - Automatic sync at lifecycle events
4. **Agent Orchestration** - Multi-agent coordination with quality gates
5. **Three-Permission Sync** - Granular control over external tool integration
6. **Plugin Architecture** - Modular, context-efficient loading

All components work together to transform AI-assisted coding into spec-driven, documented, enterprise-grade development.

---

## Navigation

- [Glossary](/docs/glossary/)
- [ADRs](./adr/)
- [Comprehensive Diagrams](./diagrams/COMPREHENSIVE-DIAGRAMS)
