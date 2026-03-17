# What is SpecWeave?

**SpecWeave is a spec-first AI development framework** — a behavior layer that brings structure, persistence, and quality gates to any AI coding tool.

Where Claude Code, Cursor, Copilot, and Codex are stateless by default, SpecWeave adds the missing layer: standards that survive sessions, specs that never disappear, and quality that's enforced — not hoped for.

*Works with Claude Code, Cursor, Copilot, Codex, Antigravity, and any LLM-powered coding tool.*

## The Problem

AI coding tools are powerful. They're also stateless, unstructured, and uncoordinated by default.

Every session starts from zero. Standards vary by who's prompting. Parallel agents have no coordination layer. Multi-repo brownfield codebases — dozens of repos, years of undocumented decisions, existing systems that must be extended — are where AI tools fall apart hardest.

**The result:**
- No documentation = regression risk
- No specs = unclear requirements
- Manual testing = inconsistent quality
- Context bloat = expensive AI costs
- No architecture = technical debt
- New team members = 2 weeks onboarding

## The Solution: Configure AI, Don't Prompt It

SpecWeave encodes your standards into version-controlled configuration. Every developer, every AI tool, every session enforces them identically — automatically.

```json
// .specweave/config.json
{
  "testing": { "defaultTestMode": "TDD", "tddEnforcement": "strict" },
  "quality": { "grillRequired": true, "judgeLlmRequired": true },
  "sync": { "github": true, "jira": true }
}
```

This is the difference between **asking** an AI to follow a process and **configuring** it to. No prompting required. No hoping it remembers. The config is the contract.

SpecWeave enforces **Spec-Driven Development**:

<p align="center">
  <img src="https://raw.githubusercontent.com/anton-abyzov/specweave/develop/docs-site/static/img/specweave-flow.svg" alt="SpecWeave Flow: Your Idea → Spec → Plan → Tasks → Code → Living Docs" width="800"/>
</p>

### Key Principles

1. **Plan > Code** - The plan is the source of truth; code is its derivative. Bad plans create orders of magnitude more rework than bad code — review the plan, not just the code ([learn more](/docs/overview/philosophy#1-plan-as-source-of-truth))
2. **Specification Before Implementation** - Define WHAT and WHY before HOW
3. **One Increment at a Time** - Each feature is a focused, reviewable unit of work — controllable through your sprint or external tools (GitHub, JIRA, ADO)
4. **Living Documentation** - Specs evolve with code, never diverge
5. **Context Precision** - Load only what's needed (70%+ token reduction)
6. **Test-Validated Features** - Every feature proven through automated tests
7. **Regression Prevention** - Document existing code before modification
8. **Framework Agnostic** - Works with ANY tech stack (TypeScript, Python, Go, Rust, Java, etc.)

## How It Works

### 1. One Command Creates Foundation

```bash
/sw:increment "Add dark mode toggle"
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
/sw:do
```

Autonomous execution through all tasks with quality validation.

### 3. One Command Closes

```bash
/sw:done 0001
```

Three quality gates validate completion:
- All tasks complete
- Test coverage enforced (unit: 95%, integration: 90%, E2E: 100% — configurable per project)
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

| Feature | Benefit | Uniqueness |
|---------|---------|------------|
| **70%+ Token Reduction** | Plugin architecture loads only active increment + relevant agent = ~15K tokens (vs 200K+) | ⭐ Unique |
| **Brownfield Excellence** | Import existing docs (Notion, Confluence, Wiki), create retroactive specs, ADRs | ⭐ Unique |
| **Living Documentation** | Specs auto-update after every task via hooks—never drift from code | ⭐ Unique |
| **LSP Code Intelligence** | Semantic symbol resolution — 198x faster than grep, zero false positives across TypeScript, Python, Go, Rust, Java, C# | ⭐ Unique |
| **External Sync** | Push specs to GitHub/JIRA/ADO, read status back—keep existing workflows | Strong |
| **Quality Gates** | Three-gate validation (tasks + test coverage + docs) before closing | Strong |
| **~42 Built-in Skills** | PM, Architect, Tech Lead, QA, Security, DevOps work autonomously | Good |
| **Universal Stack** | Works with ANY tech stack and ANY AI tool (Claude, Cursor, Copilot) | Expected |

## What You Get vs. Current State

| Before | After SpecWeave |
|--------|-----------------|
| Specs in chat history | **Permanent, searchable specs** |
| Manual JIRA/GitHub updates | **Auto-sync on every task** |
| Tests? Maybe later... | **Tests embedded in every task** |
| Architecture in your head | **ADRs captured automatically** |
| "Ask John, he knows" | **Living docs, always current** |
| Onboarding: 2 weeks | **Onboarding: 1 day** |

## Built With SpecWeave

SpecWeave builds itself. Every feature, bug fix, and release across 2,500+ commits and 400+ versions is spec-driven — proving the methodology works at the scale and complexity it's designed for.

**[Browse increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)** — see how SpecWeave develops SpecWeave.

---

## Getting Started

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/sw:increment "Add dark mode toggle"
/sw:do
/sw:done 0001
```

**Pro tip**: Use `/sw:next` to flow through the entire cycle. One command auto-closes completed work and suggests what's next — review specs/tasks when needed, otherwise just keep clicking "next".

**[Full Quickstart Guide](/docs/getting-started)**

---

**Next**: [Key Features](/docs/overview/features) ->
