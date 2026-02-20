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

<p align="center">
  <img src="https://raw.githubusercontent.com/anton-abyzov/specweave/develop/docs-site/static/img/specweave-flow.svg" alt="SpecWeave Flow: Your Idea → Spec → Plan → Tasks → Code → Living Docs" width="800"/>
</p>

### Key Principles

1. **Specification Before Implementation** - Define WHAT and WHY before HOW
2. **Living Documentation** - Specs evolve with code, never diverge
3. **Context Precision** - Load only what's needed (70%+ token reduction)
4. **Test-Validated Features** - Every feature proven through automated tests
5. **Regression Prevention** - Document existing code before modification
6. **Framework Agnostic** - Works with ANY tech stack ([TypeScript](/docs/glossary/terms/typescript), Python, Go, Rust, Java, etc.)

## How It Works

### 1. One Command Creates Foundation

```bash
/specweave:increment "Add dark mode toggle"
```

AI agents (PM, Architect, Planner) create:

```
.specweave/increments/0001-dark-mode/
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

Your work syncs to [GitHub](/docs/glossary/terms/github-actions) Issues, JIRA, and Azure DevOps automatically.

## Who Should Use SpecWeave?

### Perfect For

- **Enterprise teams** building production systems
- **Startups** needing scalable architecture from day one
- **Solo developers** building complex applications
- **Regulated industries** ([healthcare - HIPAA](/docs/glossary/terms/hipaa), [finance - SOC 2](/docs/glossary/terms/soc2))
- **Teams migrating [brownfield](/docs/glossary/terms/brownfield) codebases** to modern practices

### Use Cases

- **[Greenfield](/docs/glossary/terms/greenfield) projects**: Start with comprehensive specs
- **[Brownfield](/docs/glossary/terms/brownfield) projects**: Document existing code before modification
- **Iterative development**: Build documentation gradually
- **Compliance-heavy**: Maintain audit trails and traceability

## Core Features

| Feature | Benefit | Uniqueness |
|---------|---------|------------|
| **70%+ Token Reduction** | Plugin architecture loads only active increment + relevant agent = ~15K tokens (vs 200K+) | ⭐ Unique |
| **[Brownfield](/docs/glossary/terms/brownfield) Excellence** | Import existing docs (Notion, Confluence, Wiki), create retroactive specs, ADRs | ⭐ Unique |
| **Living Documentation** | Specs auto-update after every task via hooks—never drift from code | ⭐ Unique |
| **External Sync** | Push specs to GitHub/JIRA/ADO, read status back—keep existing workflows | Strong |
| **Quality Gates** | Three-gate validation (tasks + 60%+ tests + docs) before closing | Strong |
| **68+ AI Agents** | PM, Architect, Tech Lead, QA, Security, DevOps work autonomously (Claude Opus 4.6) | Good |
| **Universal Stack** | Works with ANY tech stack and ANY AI tool (Claude, Cursor, Copilot) | Expected |

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
/specweave:increment "Add dark mode toggle"
/specweave:do
/specweave:done 0001
```

**Pro tip**: Use `/specweave:next` to flow through the entire cycle. One command auto-closes completed work and suggests what's next — review specs/tasks when needed, otherwise just keep clicking "next".

**[Full Quickstart Guide](/docs/guides/getting-started/quickstart)**

---

**Next**: [Key Features](/docs/overview/features) ->
