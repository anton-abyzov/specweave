# What is SpecWeave?

**SpecWeave is the spec-driven Skill Fabric for AI coding agents.** Program your AI in English. Ship features while you sleep.

Skills are programs written in English — reusable, extensible logic that controls how AI thinks, decides, and acts. Describe what you want to build, AI asks the right questions, creates specifications, and builds it autonomously. Every decision becomes permanent, searchable documentation.

**You don't need to learn Claude Code docs.** SpecWeave handles hooks, plugins, CLAUDE.md, and context management for you. [Learn more](./no-docs-needed).

**Enterprise ready.** Compliance audit trails, brownfield analysis, JIRA/ADO sync, multi-repo coordination. [Enterprise overview](/docs/enterprise).

## Stop Repeating Yourself

Every app needs the same things: auth, tests, docs, deployment. Without SpecWeave, you dictate every step:

```
"Create user authentication"
"Now add tests for that"
"Document the architecture"
"Update JIRA with progress"
"Create the PR description"
```

**With SpecWeave:**
```bash
/sw:increment "User authentication"
/sw:auto
# Done. Tests, docs, sync - all handled.
```

### One Command = Many Prompts

| What You Used To Dictate | SpecWeave Command |
|-------------------------|-------------------|
| "Create spec with user stories..." | `/sw:increment "feature"` |
| "Implement, test, fix, repeat..." | `/sw:auto` (runs for hours) |
| "Update GitHub/JIRA..." | `/sw:sync-progress` |
| "Review for security..." | Auto-activates on keywords |
| "Commit and create PR..." | `/sw:save` |

### Built-In Expertise

SpecWeave isn't just shortcuts — it's **programs in English** that encapsulate expert knowledge:

- **100+ skills** (PM, Architect, QA, Security, Frontend, Backend, ML) — each one a reusable program you can customize
- **Skills auto-activate** — mention "security" and security expertise loads automatically
- **Quality gates** enforce what senior devs know: tests before merge, docs before close
- **Agent swarms** — run parallel agents across iTerm/tmux panes for maximum throughput

**Real result**: 5 production apps built with SpecWeave. Then 10 and 14-year-old daughters learned to do the same - because the expertise is built in, not in knowing what to ask.

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
6. **Stack Agnostic** - Works with ANY tech stack

## How It Works

### 1. One Command Creates Foundation

```bash
/sw:increment "User authentication with OAuth"
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
/sw:do
```

Autonomous execution through all tasks with quality validation.

### 3. One Command Closes

```bash
/sw:done 0001
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
- **Regulated industries** (healthcare - [HIPAA](/docs/glossary/terms/hipaa), finance - [SOC 2](/docs/glossary/terms/soc2))
- **Teams migrating [brownfield](/docs/glossary/terms/brownfield) codebases** to modern practices

### Use Cases

- **[Greenfield](/docs/glossary/terms/greenfield) projects**: Start with comprehensive specs
- **[Brownfield](/docs/glossary/terms/brownfield) projects**: Document existing code before modification
- **Iterative development**: Build documentation gradually
- **Compliance-heavy**: Maintain audit trails and traceability

## Core Features

| Feature | Benefit |
|---------|---------|
| **68+ AI Agents** | [PM](/docs/glossary/terms/pm-agent), [Architect](/docs/glossary/terms/architect-agent), [QA](/docs/glossary/terms/qa-lead-agent), Security, DevOps work autonomously (Claude Opus 4.6) |
| **[Living Documentation](/docs/glossary/terms/living-docs)** | Specs auto-update after every task via [hooks](/docs/glossary/terms/hooks) |
| **70% Token Reduction** | Context precision loads only what you need |
| **[Quality Gates](/docs/glossary/terms/quality-gate)** | Three-gate validation before closing [increments](/docs/glossary/terms/increments) |
| **External Sync** | Push specs to GitHub/JIRA/ADO, read status back |
| **[Brownfield](/docs/glossary/terms/brownfield) Support** | Import existing docs, create retroactive specs |
| **Multi-Language** | Work in ANY language (Russian, Spanish, Chinese, etc.) |

## What You Get vs. Current State

| Before | After SpecWeave |
|--------|-----------------|
| Specs in chat history | **Permanent, searchable specs** |
| Manual JIRA/GitHub updates | **Auto-sync on every task** |
| Tests? Maybe later... | **Tests embedded in tasks (60%+ enforced)** |
| Architecture in your head | **[ADRs](/docs/glossary/terms/adr) captured automatically** |
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
/sw:increment "Your first feature"
/sw:do
/sw:done 0001
```

**[Full Quickstart Guide](/docs/guides/getting-started/quickstart)**

---

**Next**: [Key Features](/docs/overview/features) ->
