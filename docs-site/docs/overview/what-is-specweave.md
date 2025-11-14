---
sidebar_position: 1
---

# What is SpecWeave?

**SpecWeave** is the first AI-native enterprise management framework that turns Claude into your full engineering team. Not just code generation - Claude directly manages your JIRA, GitHub, Azure DevOps, documentation, architecture, and compliance. Built on Claude Code's native plugin system.

## The Problem SpecWeave Solves

**Traditional AI-assisted development**:
- ❌ AI writes code, YOU manually update JIRA (3 hours/week wasted)
- ❌ No structure (just chat with AI)
- ❌ Documentation becomes stale
- ❌ Enterprise tools isolated from AI workflow
- ❌ Context bloat (slow, expensive)
- ❌ No audit trail (can't track what was built)

**SpecWeave solution**:
- ✅ **AI updates enterprise tools automatically** (JIRA/GitHub/ADO sync)
- ✅ Structured workflows (spec → plan → tasks → implementation)
- ✅ Living documentation (auto-syncs after every task)
- ✅ **Bidirectional sync** (Claude reads & writes your project management tools)
- ✅ Quality gates (validation, testing, coverage checks)
- ✅ 75%+ context reduction (modular plugins)
- ✅ Complete audit trail (every decision documented)

## 🚀 The Revolutionary Feature: AI-Native Enterprise Management

**SpecWeave is the only framework where Claude directly controls your enterprise tools.**

### What This Means

**Traditional AI coding**:
```
You → AI → Code
You → Manual → JIRA updates (waste)
You → Manual → GitHub updates (waste)
You → Manual → Docs (waste)
```

**SpecWeave**:
```
You → Claude → Code + JIRA + GitHub + Docs (automatic!)

Example workflow:
/specweave:increment "User authentication"
→ Claude creates spec.md
→ Claude creates JIRA Epic + 5 Stories ✅
→ Claude creates GitHub Issue #142 ✅

/specweave:do
→ Claude implements Task 1
→ JIRA Story → "Done" ✅ (automatic!)
→ GitHub checkbox → ✓ ✅ (automatic!)
→ Docs synced ✅ (automatic!)
```

**Your team sees real-time updates. You never touched JIRA.**

### Supported Enterprise Platforms

| Platform | Status | Capabilities |
|----------|--------|--------------|
| **GitHub Issues** | ✅ Production | Bidirectional sync, task tracking, auto-close, multi-repo |
| **JIRA** | ✅ Production | Epic/Story sync, status updates, comments, unlimited projects |
| **Azure DevOps** | ✅ Production | Work items, hierarchy, area paths, team-based organization |
| **Linear** | 🔄 Q1 2026 | Full integration planned |
| **Asana** | 🔄 Q2 2026 | Full integration planned |

### Who Benefits Most

**Solo Founders**: Appear like a full engineering team to investors/clients

**Agencies**: Client A (JIRA) + Client B (ADO) + Client C (GitHub) = Zero PM overhead

**Small Teams**: No dedicated PM needed (Claude orchestrates everything)

**Enterprises**: SOC2/ISO audit trails automatic, real-time management visibility

**ROI**: Reclaim 9+ hours/week = $35K+/year saved per developer

## How It Works

### 1. Spec-First Workflow

```
Write Spec → Design Architecture → Break into Tasks → Implement → Auto-Sync Docs
```

**Example**:
```bash
/specweave:increment "Add user authentication"
# → PM agent creates spec.md (user stories, acceptance criteria)
# → Architect creates plan.md (system design, tech stack)
# → Planner creates tasks.md (implementation tasks with embedded tests)
# → Developer implements (guided by spec and plan)
# → Hooks auto-sync docs after every task completion
```

### 2. Living Documentation

**Automatic synchronization** ensures docs never become stale:

```
.specweave/
├── increments/                    # Immutable history
│   └── 0001-user-auth/
│       ├── spec.md               # What we built
│       ├── plan.md               # How we built it
│       └── tasks.md              # Tasks + embedded tests
│
└── docs/internal/                # Living docs (auto-updated)
    ├── specs/                    # Permanent knowledge base
    │   └── spec-001-auth.md      # ← Auto-synced from increment
    └── architecture/
        └── adr/
            └── 0001-jwt.md       # ← Architecture decisions
```

**After every task completion**, hooks automatically sync:
- ✅ Increment specs → Living docs specs
- ✅ Architecture decisions → ADRs
- ✅ Task completion → GitHub/Jira sync (if enabled)

### 3. Modular Plugin Architecture

**Load only what you need** (75%+ context reduction):

```
Core Plugin (12K tokens, always loaded)
├── increment-planner skill
├── PM agent
├── Architect agent
└── 19 other specialized agents

+ Optional Plugins (load on demand)
├── GitHub sync (3K tokens)
├── Frontend/React (4K tokens)
├── Kubernetes (5K tokens)
└── 15+ more plugins
```

**Result**: Simple React app loads ~19K tokens (vs 50K+ monolithic)

## Key Features

### For Individual Developers
- 🚀 **Fast initialization** (&lt;2 seconds vs 8+ seconds)
- 📚 **Living documentation** (always current)
- ✅ **Quality gates** (validation, test coverage)
- 🔌 **Plugin marketplace** (extend with custom capabilities)

### For Teams
- 📊 **DORA metrics** (track deployment frequency, lead time)
- 🔄 **External sync** (GitHub, Jira, Azure DevOps)
- 👥 **Multi-project support** (organize by team/repo)
- 📈 **Audit trail** (complete compliance history)

### For Enterprises
- 🔒 **Security** (SOC 2, HIPAA, GDPR compliant)
- 📋 **Traceability** (requirements → tests → code)
- 🏢 **Brownfield support** (integrate existing codebases)
- 💰 **Cost optimization** (75%+ context reduction = lower AI costs)

## Real-World Example

**Scenario**: Add user authentication to a SaaS app

**Traditional approach** (16 hours):
```
1. Chat with AI (3 hours of back-and-forth)
2. Implement code (5 hours)
3. Fix bugs (4 hours)
4. Write docs manually (2 hours)
5. Docs become stale within weeks (2 hours to update)
Total: 16 hours + ongoing doc maintenance
```

**SpecWeave approach** (8 hours):
```
1. /specweave:increment "user authentication" (PM creates spec: 1 hour)
2. Architect designs system (plan.md: 1 hour)
3. Implement with guidance (tasks.md: 5 hours)
4. Docs auto-sync (0 hours - hooks do it)
5. Docs stay current forever (0 hours - hooks maintain it)
Total: 7 hours + zero ongoing maintenance
```

**Savings**: 50% faster + zero doc maintenance + complete audit trail

## Who Uses SpecWeave?

### Individual Developers
- Freelancers building client projects
- Side projects with quality standards
- Open-source maintainers needing structure

### Startups & Small Teams
- Moving fast but need quality
- Building MVP with enterprise mindset
- Preparing for compliance (SOC 2, etc.)

### Enterprises
- Regulated industries (fintech, healthcare)
- Large codebases needing organization
- Teams needing audit trails

## Getting Started

```bash
# Install SpecWeave
npm install -g specweave

# Initialize in your project
specweave init

# Create your first increment
/specweave:increment "Your feature description"

# Implement with guided workflow
/specweave:do

# Close when complete (auto-validates)
/specweave:done
```

## Learn More

- [Key Features](./key-features) - Detailed capabilities
- [Philosophy](./philosophy) - Core principles
- [Quickstart Guide](/docs/intro#getting-started) - Get up and running
- [Complete Journey](/docs/workflows/overview) - End-to-end workflow

---

**SpecWeave**: Spec-driven development for the AI era.
