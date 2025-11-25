# What is SpecWeave?

**SpecWeave is the AI development framework that doesn't lose your work.**

Every AI coding tool promises productivity. But after the chat ends, your specs disappear into chat history, your architecture decisions are forgotten, and new team members start from zero.

**SpecWeave is the only framework where AI decisions become permanent, searchable documentation.**

## The Problem: Lost Work

Traditional AI-assisted development:

1. Tell AI: "Build me a feature"
2. AI generates code
3. Test it manually
4. Fix bugs as they appear
5. (Maybe) document it later
6. Repeat for next feature

**The result:**
- No documentation = regression risk
- No specs = unclear requirements
- Manual testing = inconsistent quality
- Context bloat = expensive AI costs
- No architecture = technical debt
- New team members = 2 weeks onboarding

## The Solution: Permanent Knowledge

SpecWeave enforces **Spec-Driven Development**:

```mermaid
flowchart LR
    A["Your Idea"] --> B["Spec ✓"]
    B --> C["Plan ✓"]
    C --> D["Tasks ✓"]
    D --> E["Code"]
    E --> F["Living Docs"]

    style B fill:#d4edda,stroke:#28a745
    style C fill:#d4edda,stroke:#28a745
    style D fill:#d4edda,stroke:#28a745
    style F fill:#cce5ff,stroke:#0d6efd
```

**Permanent** = survives chat sessions | **Auto-sync** = updates automatically

### Key Principles

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Context Precision** - Load only what's needed (70%+ token reduction)
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Regression Prevention** - Document existing code before modification
6. **Framework Agnostic** - Works with ANY tech stack

## How It Works

### 1. One Command Creates Foundation

```bash
/specweave:increment "User authentication with OAuth"
```

AI agents (PM, Architect, Planner) create:

```
.specweave/increments/0001-user-authentication/
├── spec.md    <- WHAT: User stories, acceptance criteria
├── plan.md    <- HOW: Architecture, ADRs, tech decisions
└── tasks.md   <- DO: Tasks with embedded tests
```

### 2. One Command Builds

```bash
/specweave:do
```

Autonomous execution through all tasks with quality validation.

### 3. One Command Closes

```bash
/specweave:done 0001
```

Three quality gates validate completion:
- All tasks complete
- 60%+ test coverage
- Living docs updated

### 4. Auto-Sync Everywhere

Your work syncs to GitHub Issues, JIRA, and Azure DevOps automatically.

## Who Should Use SpecWeave?

### Perfect For

- **Enterprise teams** building production systems
- **Startups** needing scalable architecture from day one
- **Solo developers** building complex applications
- **Regulated industries** (healthcare - HIPAA, finance - SOC 2)
- **Teams migrating brownfield codebases** to modern practices

### Use Cases

- **Greenfield projects**: Start with comprehensive specs
- **Brownfield projects**: Document existing code before modification
- **Iterative development**: Build documentation gradually
- **Compliance-heavy**: Maintain audit trails and traceability

## Core Features

| Feature | Benefit |
|---------|---------|
| **15+ AI Agents** | PM, Architect, Tech Lead, QA, Security, DevOps work autonomously |
| **Living Documentation** | Specs auto-update after every task via hooks |
| **70% Token Reduction** | Context precision loads only what you need |
| **Quality Gates** | Three-gate validation before closing increments |
| **External Sync** | GitHub/JIRA/Azure DevOps bidirectional sync |
| **Brownfield Support** | Import existing docs, create retroactive specs |
| **Multi-Language** | Work in ANY language (Russian, Spanish, Chinese, etc.) |

## What You Get vs. Current State

| Before | After SpecWeave |
|--------|-----------------|
| Specs in chat history | **Permanent, searchable specs** |
| Manual JIRA/GitHub updates | **Auto-sync on every task** |
| Tests? Maybe later... | **Tests embedded in tasks (60%+ enforced)** |
| Architecture in your head | **ADRs captured automatically** |
| "Ask John, he knows" | **Living docs, always current** |
| Onboarding: 2 weeks | **Onboarding: 1 day** |

---

## Getting Started

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/specweave:increment "Your first feature"
/specweave:do
/specweave:done 0001
```

**[Full Quickstart Guide](/docs/guides/getting-started/quickstart)**

---

**Next**: [Key Features](/docs/overview/features) ->
