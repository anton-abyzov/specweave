# SpecWeave Quick Reference Card

**Last Updated**: 2026-01-08
**Version**: 1.0.109

---

## 🎯 Core Concepts (5-Minute Overview)

### What is SpecWeave?

SpecWeave is a **spec-driven development framework** that uses:
- **Temporary increments** (work units) that feed **permanent living docs**
- **Specification-first approach** (write specs before code)
- **Event-driven architecture** (hooks for automation)
- **Multi-agent planning** (PM → Architect → Tech Lead)
- **Bidirectional sync** with GitHub, JIRA, Azure DevOps

### Key Numbers

- **215K+ lines** of core TypeScript code
- **25+ specialized plugins** for different domains
- **60+ CLI commands** for all workflows
- **9 languages** supported (English, Spanish, French, German, Japanese, Chinese, etc.)
- **7 increment statuses** with state machine transitions
- **6 documentation pillars** (Strategy, Specs, Architecture, Delivery, Operations, Governance)

---

## 📁 Directory Structure

```
.specweave/
├── increments/             # Temporary work units
│   └── ####-name/
│       ├── metadata.json   # Status, timestamps, sync targets
│       ├── spec.md         # User stories + Acceptance Criteria
│       ├── plan.md         # Architecture plan
│       ├── tasks.md        # Granular tasks with BDD tests
│       ├── reports/        # Validation reports, summaries
│       ├── logs/           # Execution logs (dated)
│       └── scripts/        # Helper scripts
├── docs/internal/          # Permanent living documentation
│   ├── strategy/           # Why we build (PRD, vision, OKRs)
│   ├── specs/              # What we build (feature specs)
│   ├── architecture/       # How we design (HLD, LLD, ADRs)
│   ├── delivery/           # How we build (roadmap, DORA)
│   ├── operations/         # How we run (runbooks, SLOs)
│   └── governance/         # Guardrails (security, compliance)
└── config.json             # Global configuration

plugins/                    # 25+ specialized plugins
├── specweave/              # Core plugin
├── specweave-github/       # GitHub integration
├── specweave-jira/         # JIRA integration
├── specweave-ado/          # Azure DevOps integration
└── ... (21 more)
```

---

## 🔄 Increment Lifecycle

```
PLANNING → ACTIVE → READY_FOR_REVIEW → COMPLETED
    ↓         ↓            ↓
BACKLOG   PAUSED      ABANDONED
```

**Status Rules**:
- **PLANNING**: Lightweight, doesn't count toward WIP
- **ACTIVE**: Consumes WIP limit, team actively working
- **READY_FOR_REVIEW**: Gating status, all tasks complete, awaits approval
- **COMPLETED**: User-approved via `/sw:done`, archived
- **PAUSED**: Blocked by external dependency
- **ABANDONED**: Cancelled or obsolete
- **BACKLOG**: Deprioritized, may resume later

**WIP Limits** (ACTIVE + PAUSED + READY_FOR_REVIEW):
- HOTFIX: Unlimited
- BUG: Unlimited
- FEATURE: Max 2
- CHANGE_REQUEST: Max 2
- REFACTOR: Max 1
- EXPERIMENT: Unlimited (auto-abandon after 14 days)

---

## 📝 Specification Format

### spec.md Structure

```yaml
---
increment: 0001-feature-name
title: "Feature Title"
---

## User Stories

### US-001: User Story Title
**Project**: my-project
**As a** user, **I want** X **so that** Y

#### Acceptance Criteria
- [ ] **AC-US1-01**: Criterion 1
- [ ] **AC-US1-02**: Criterion 2
```

### tasks.md Structure

```markdown
### T-001: Task Title
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending

#### Acceptance
- [ ] **AC-US1-01**: Criterion 1 (auto-synced from spec.md)
- [ ] **AC-US1-02**: Criterion 2 (auto-synced from spec.md)

**Test**: Given [context] → When [action] → Then [outcome]
```

**Auto-Sync Rules**:
1. Mark task `[x]` in tasks.md
2. ALL acceptance checkboxes in that task → `[x]`
3. Corresponding ACs in spec.md → `[x]`
4. If ALL tasks complete → Auto-transition to READY_FOR_REVIEW

---

## 🎮 Essential Commands

### Planning & Creation

```bash
/sw:increment "Feature name"    # Create new increment (PM → Architect → Tech Lead)
/sw:plan                        # Generate plan.md and tasks.md
```

### Execution

```bash
/sw:do                          # Execute tasks manually
/sw:auto                        # Autonomous execution until complete
/sw:auto-status                 # Check auto session progress
/sw:cancel-auto                 # Emergency stop (prefer closing session)
```

### Status & Progress

```bash
/sw:status                      # Show all increments
/sw:progress                    # Show task completion status
/sw:jobs                        # Show active work and background jobs
```

### Completion

```bash
/sw:done 0001                   # Close increment (validates gates)
/sw:validate 0001               # Pre-validate before closing
```

### State Management

```bash
/sw:pause 0001                  # Pause (blocked by dependency)
/sw:resume 0001                 # Resume paused increment
/sw:abandon 0001                # Mark as abandoned
/sw:reopen 0001                 # Reopen completed increment
/sw:backlog 0001                # Move to backlog
```

### Sync & External Tools

```bash
/sw:sync-progress               # Full sync: tasks → living docs → external tools
/sw-github:sync                 # GitHub sync (create/update issues)
/sw-jira:sync                   # JIRA sync (create/update stories)
/sw-ado:sync                    # Azure DevOps sync (create/update work items)
/sw:set-sync-target 0001        # Explicitly set external tool target
```

### Hooks & Validation

```bash
/sw:check-hooks                 # Health check hooks
/sw:install-hooks               # Install git hooks
/sw:validate-status-sync        # Detect/fix status desyncs
```

---

## 🔌 Plugin System

### Plugin Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json              # Manifest
├── skills/                      # Auto-activating capabilities
│   └── skill-name/
│       ├── SKILL.md             # Trigger patterns
│       └── skill.ts             # Implementation
├── agents/                      # Specialized roles
│   └── agent-name/
│       ├── AGENT.md             # System prompt
│       └── agent.ts             # Configuration
├── commands/                    # Slash commands
│   └── command.ts
└── hooks/                       # Event hooks
    └── hook-name.sh/.ts/.py
```

### 25 Specialized Plugins

| Category | Plugins |
|----------|---------|
| **Core** | specweave |
| **Integration** | github, jira, ado |
| **Infrastructure** | k8s, kafka, confluent, infra |
| **Frontend** | frontend, ui, figma, mobile |
| **Backend** | backend, payments |
| **ML/AI** | ml |
| **Testing** | testing |
| **Docs & Release** | docs, release |
| **Specialized** | diagrams, n8n, cost |

---

## 🪝 Hook System

### Built-in Hooks

| Hook | Trigger | Purpose |
|------|---------|---------|
| `auto-transition` | Task completion | Auto-transition ACTIVE → READY_FOR_REVIEW |
| `update-tasks-md` | Task completion | Sync AC completion across tasks.md |
| `sync-living-docs` | Increment creation | Update living documentation |
| `reflection` | Session end | Extract learnings to memory |
| `git-diff-analyzer` | Git commit | Analyze code changes |
| `stop-reflect` | Session end | Run reflection (learning extraction) |
| `stop-auto` | Auto mode | Decide continue or stop |
| `stop-sync` | Session end | Sync pending changes |

### Hook Execution

- **Isolation**: Each hook runs in separate child process
- **Timeout**: 20s default (SIGTERM → SIGKILL after 5s)
- **Health checking**: Validates syntax, imports, performance
- **Auto-fixing**: Detects and fixes common errors
- **Logging**: Structured logs with 7-day retention

---

## 🔄 External Sync Mapping

| SpecWeave | GitHub | JIRA | Azure DevOps |
|-----------|--------|------|--------------|
| Feature (FS-XXX) | Milestone | Epic | Area Path |
| User Story (US-XXX) | Issue `[FS-XXX][US-YYY]` | Story | User Story |
| Acceptance Criteria | Checkbox | Sub-task | Acceptance |
| Task (T-XXX) | Checkbox | Task | Task |

### Sync Configuration

```json
{
  "sync": {
    "profiles": [
      {
        "id": "github-frontend",
        "provider": "github",
        "owner": "company",
        "repo": "frontend"
      }
    ],
    "orchestration": {
      "permissions": {
        "github": {
          "canRead": true,
          "canUpdateStatus": true,
          "canUpsert": true,
          "canDelete": false
        }
      }
    }
  }
}
```

---

## 🎯 Common Workflows

### Workflow 1: Create and Execute Increment

```bash
# 1. Create increment
/sw:increment "Add user authentication"

# 2. Review generated spec.md, plan.md, tasks.md

# 3. Execute tasks
/sw:do    # Manual execution
# OR
/sw:auto  # Autonomous execution

# 4. Check progress
/sw:progress

# 5. Complete
/sw:done 0001
```

### Workflow 2: Pause and Resume

```bash
# 1. Check active increments
/sw:status

# 2. Pause increment (blocked by external dependency)
/sw:pause 0001 "Waiting for API approval"

# 3. Later, resume
/sw:resume 0001
```

### Workflow 3: Sync with External Tools

```bash
# 1. Set sync target explicitly
/sw:set-sync-target 0001 github-frontend

# 2. Create external issue
/sw-github:create 0001

# 3. Work on tasks
/sw:do

# 4. Sync progress
/sw:sync-progress

# 5. Complete and close external issue
/sw:done 0001
/sw-github:close 0001
```

---

## 🛠️ Troubleshooting

### Issue: Increment not found

```bash
# Check increment exists
ls .specweave/increments/

# Verify metadata
cat .specweave/increments/0001-feature/metadata.json
```

### Issue: Hook not executing

```bash
# Check hook health
/sw:check-hooks

# Manually run hook
bash plugins/specweave/hooks/auto-transition.ts
```

### Issue: Sync failing

```bash
# Check sync logs
cat .specweave/logs/sync-audit-YYYY-MM-DD.log

# Check permissions
cat .specweave/config.json | grep -A 10 permissions

# Verify tokens
grep GITHUB_TOKEN .env
gh auth status
```

### Issue: Status desync

```bash
# Detect and fix status desync
/sw:validate-status-sync
```

---

## 📚 Key Files to Read

### For Users

1. [README.md](../../README.md) - Project introduction
2. [CLAUDE.md](../../CLAUDE.md) - SpecWeave instructions for Claude Code
3. Public docs: https://spec-weave.com

### For Contributors

1. [LEARNING-GUIDE.md](LEARNING-GUIDE.md) - 4-week learning path
2. [architecture/TECHNICAL-OVERVIEW.md](architecture/TECHNICAL-OVERVIEW.md) - Architecture overview
3. [architecture/COMPONENT-CATALOG.md](architecture/COMPONENT-CATALOG.md) - Component reference
4. [architecture/diagrams/](architecture/diagrams/) - Visual diagrams

### Key Source Files

| File | Purpose |
|------|---------|
| `src/cli/index.ts` | CLI entry point |
| `src/core/increment/metadata-manager.ts` | Increment CRUD |
| `src/core/specs/spec-parser.ts` | Parse spec.md |
| `src/core/hooks/hook-executor.ts` | Hook execution |
| `src/core/sync/sync-orchestrator.ts` | Multi-platform sync |
| `src/living-docs/living-docs-builder.ts` | Documentation generator |
| `src/core/auto/session-manager.ts` | Auto mode |

---

## 🎓 Learning Paths

### Path 1: User (1 day)

1. Read README.md
2. Install: `npm install -g specweave`
3. Initialize: `specweave init .`
4. Create increment: `/sw:increment "My feature"`
5. Execute: `/sw:do` or `/sw:auto`
6. Complete: `/sw:done 0001`

### Path 2: Contributor (4 weeks)

**Week 1**: Foundation
- Read LEARNING-GUIDE.md (Phase 1)
- Explore increments
- Study diagrams
- Hands-on: Create 3 increments

**Week 2**: Core Components
- Study MetadataManager, SpecParser, HookExecutor
- Understand increment lifecycle
- Exercise: Create custom hook

**Week 3**: Advanced Features
- Master sync engine
- Learn plugin system
- Exercise: Set up GitHub sync

**Week 4**: Expert Topics
- Living documentation
- Multi-agent system
- Performance optimization
- Submit first PR

### Path 3: Plugin Developer (1 week)

1. Read plugin system docs
2. Study `plugins/specweave/` structure
3. Create simple plugin with one skill
4. Test plugin loading
5. Submit to marketplace

---

## 🔗 Quick Links

### Documentation

- **Internal Docs**: [.specweave/docs/internal/](.specweave/docs/internal/)
- **Learning Guide**: [LEARNING-GUIDE.md](LEARNING-GUIDE.md)
- **Technical Overview**: [architecture/TECHNICAL-OVERVIEW.md](architecture/TECHNICAL-OVERVIEW.md)
- **Component Catalog**: [architecture/COMPONENT-CATALOG.md](architecture/COMPONENT-CATALOG.md)
- **Diagrams**: [architecture/diagrams/](architecture/diagrams/)
- **ADRs**: [architecture/adr/](architecture/adr/)

### External

- **Public Docs**: https://spec-weave.com
- **GitHub**: https://github.com/specweave/specweave
- **NPM**: https://www.npmjs.com/package/specweave

---

**Print this reference card for quick access!**

**Last Updated**: 2026-01-08
**Version**: 1.0.109
