---
sidebar_position: 1
---

# What is SpecWeave?

**SpecWeave** is a spec-driven development framework that brings enterprise-level discipline to AI-assisted software development. Built on Claude Code's native plugin system, it combines structured workflows, living documentation, and automated quality gates.

## The Problem SpecWeave Solves

**Traditional AI-assisted development**:
- ❌ No structure (just chat with AI)
- ❌ Documentation becomes stale
- ❌ No quality gates or validation
- ❌ Context bloat (slow, expensive)
- ❌ No audit trail (can't track what was built)

**SpecWeave solution**:
- ✅ Structured workflows (spec → plan → tasks → implementation)
- ✅ Living documentation (auto-syncs after every task)
- ✅ Quality gates (validation, testing, coverage checks)
- ✅ 75%+ context reduction (modular plugins)
- ✅ Complete audit trail (every decision documented)

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
- 🚀 **Fast initialization** (<2 seconds vs 8+ seconds)
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
