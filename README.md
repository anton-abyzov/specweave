# SpecWeave

**The Enterprise Layer for AI Coding.**

*Enterprise capabilities for Claude Code — without enterprise complexity. Permanent memory, GitHub/JIRA sync, quality gates, autonomous execution. Ship features while you sleep.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Tutorials-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

```bash
# Requires Node.js 20.12.0+ (we recommend Node.js 22 LTS)
npm install -g specweave
```

---

## Stop Repeating Yourself

Every app needs the same things: auth, tests, docs, deployment. Without SpecWeave, you dictate every step:

```
"Create user authentication"
"Now add tests for that"
"Document the architecture"
"Update JIRA with progress"
"Create the PR description"
"Run the linter and fix issues"
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
| "Create spec with user stories and ACs..." | `/sw:increment "feature"` |
| "Implement, test, fix failures, repeat..." | `/sw:auto` (runs for hours) |
| "Update GitHub/JIRA with my progress..." | `/sw:sync-progress` |
| "Review for security vulnerabilities..." | Auto-activates on keywords |
| "Commit everything and create a PR..." | `/sw:save` |

### Built-In Expertise, Not Just Commands

SpecWeave isn't just shortcuts - it's **encapsulated expertise**:

- **15+ AI agents** (PM, Architect, QA, Security) work in parallel
- **Skills auto-activate** - mention "security" and security expertise loads
- **Quality gates** enforce what senior devs know: tests before merge, docs before close
- **Patterns learned once, applied everywhere** - your best practices become defaults

**Real result**: I built 5 production apps using SpecWeave. Then taught my 10 and 14-year-old daughters to do the same - because the expertise is in the framework, not in knowing what to ask.

---

## The Problem With AI Coding Tools

Every AI coding tool promises productivity. But after the chat ends:

| What Happens | The Cost |
|-------------|----------|
| Specs disappear into chat history | No traceability for audits |
| Architecture decisions forgotten | Repeated debates, inconsistent code |
| Tests? "We'll add them later" | Regressions, production bugs |
| JIRA/GitHub manually updated | Stale tickets, wrong priorities |
| Onboarding: "Ask John, he knows" | Knowledge silos, bus factor |

**The real problem:** AI generates code, but code without context is technical debt waiting to happen.

---

## SpecWeave: AI That Works While You Sleep

```bash
/sw:increment "Add OAuth authentication"  # Creates spec + plan + tasks
/sw:auto                                   # Autonomous execution for HOURS
# ↑ Watch live: [Planning] → [Implementing] → [Testing] → [Fixing] → [Done]
```

**What happens during `/sw:auto`:**
```
[08:23:41] [Planning]      Analyzing T-003: Implement refresh token rotation
[08:24:12] [Implementing]  Writing src/auth/token-manager.ts (127 lines)
[08:25:33] [Testing]       Running npm test -- token-manager.test.ts
[08:25:47] [Fixing]        Test failed: Expected 401, got 403. Adjusting...
[08:26:15] [Testing]       Re-running tests... PASSED
[08:26:18] [Syncing]       Updating tasks.md, pushing to GitHub
[08:26:22] [Done]          T-003 complete. Moving to T-004...
```

**Or step-by-step control:**
```bash
/sw:do                                     # Execute one task at a time
/sw:done 0001                              # Validates: tests pass, docs updated
```

**Every feature** creates three permanent files:

```
.specweave/increments/0001-oauth/
├── spec.md    <- WHAT: User stories, acceptance criteria
├── plan.md    <- HOW: Architecture decisions, tech choices
└── tasks.md   <- DO: Implementation tasks with embedded tests
```

**After 6 months**: Search "OAuth" -> find exact decisions, who approved, why it was built that way.

---

## Why SpecWeave vs BMAD, SpecKit, Cursor Rules?

| Capability | [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) | [SpecKit](https://github.com/github/spec-kit) | Cursor Rules | **SpecWeave** |
|---|---|---|---|---|
| **Maturity** | Alpha (v6) | Stable | Built-in | **Production** |
| **Autonomous Work** | Manual steps required | One-shot generation | Per-request only | **Hours unattended** |
| **Live Status** | None | None | None | **Terminal labels** |
| **Multi-Repo** | Single repo | Single repo | Single repo | **Coordinate N repos** |
| **Mobile Apps** | No agents | No agents | No agents | **React Native/Expo** |
| **External Sync** | None | None | None | **GitHub/JIRA/ADO** |
| **Brownfield** | Limited | Greenfield only | Any | **10-year legacy? Fine.** |
| **Quality Gates** | Not built-in | None | None | **3-gate validation** |
| **Living Docs** | Manual | Snapshot | None | **Auto-update** |
| **Self-Learning** | None | None | None | **Reflects on mistakes** |
| **Dogfooding** | Unknown | Unknown | N/A | **140+ self-built features** |

**The math**: SpecKit output = ONE SpecWeave increment. SpecWeave = N increments + lifecycle + sync + hooks + **hours of autonomous execution**.

---

## Proof: Built With SpecWeave

> This framework builds itself. Every feature, bug fix, and release — all spec-driven.

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Lead Time](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=h&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Change Failure Rate](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![MTTR](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=min&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)

| Metric | Value |
|--------|-------|
| Features shipped | 140+ with full specs |
| Living docs | Auto-update on every task |
| DORA metrics | Live tracking |
| Test coverage | 60%+ enforced |

**[Browse our increments ->](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)**

---

## Quick Start

### Prerequisites

**Node.js 20.12.0 or higher is required** (we recommend Node.js 22 LTS).

```bash
# Check your version
node --version

# If below v20.12.0, upgrade using nvm:
nvm install 22 && nvm use 22 && nvm alias default 22
```

> **Getting `SyntaxError: Unexpected token 'with'`?** Your Node.js is too old. See [upgrade instructions](https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error).

### New Project (Greenfield)

```bash
npm install -g specweave
mkdir my-app && cd my-app
specweave init .
```

Then in Claude Code, just describe what you want:
```
"Build a calculator app with React"
```

SpecWeave guides you through features, tech stack, and approach — then creates your first increment automatically.

### Existing Project

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/sw:increment "Add dark mode"  # AI creates spec + plan + tasks
/sw:auto                       # Ship while you sleep (hours of autonomous work)
```

**Or step-by-step:**
```bash
/sw:do                         # Execute tasks one at a time
/sw:done 0001                  # Quality-validated completion
```

**Troubleshooting** - if commands/skills stop working:
```bash
specweave update              # Full update: CLI + instructions + config (recommended)
specweave update --plugins    # Also refresh marketplace plugins
specweave refresh-marketplace # Reinstall all plugins from GitHub (standalone)
```

**[Full Quickstart Guide ->](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Key Features

### Autonomous Execution

Run for hours without intervention. See exactly what's happening:

```bash
/sw:auto                  # Start autonomous mode
/sw:auto-status           # Check progress anytime
/sw:cancel-auto           # Emergency stop (rarely needed)
```

**What you see in terminal:**
- `[Planning]` - Analyzing task requirements
- `[Implementing]` - Writing code
- `[Testing]` - Running test suites
- `[Fixing]` - Auto-correcting failures
- `[Syncing]` - Updating docs and external tools
- `[Done]` - Task complete, moving to next

### External Tool Integration

| Platform | Capabilities |
|----------|--------------|
| **GitHub Issues** | Create, update, close, progress sync |
| **JIRA** | Epic/Story hierarchy, bidirectional sync |
| **Azure DevOps** | Work items, area paths, status sync |

```bash
/sw:sync-progress  # Push updates to all connected tools
```

### Works With ANY AI Tool

SpecWeave is **structure, not AI magic**. `spec.md` and `tasks.md` are just markdown.

- Sarah uses Claude. Mike uses GPT-4. Alex uses Copilot.
- Everyone works on the same specs, same tasks, same acceptance criteria.
- **Claude Code** gets the best experience (slash commands, hooks, skills). But any AI can participate.

### Living Documentation

Documentation updates **on lifecycle events** — not on every edit, but when it matters:

| Event | What Updates |
|-------|--------------|
| `increment.done` | Marked complete, living docs synced |
| `user-story.completed` | Status refreshed, external tools updated |
| `increment.reopened` | Restored from archive |

### Quality Gates

Three gates before any increment closes:
1. **Tasks**: All marked complete
2. **Tests**: 60%+ coverage (configurable)
3. **Documentation**: Living docs updated

### Token Efficiency (MCP Tool Search)

**85%+ context reduction** with Claude Code 2.1.7+ MCP Tool Search (lazy loading):

| Before (2.1.6-) | After (2.1.7+) |
|-----------------|----------------|
| All plugins loaded upfront (~100k tokens) | On-demand loading (~5-10k tokens) |
| Max ~25 tasks/increment | ~50+ tasks/increment |
| `/sw:auto` context-limited | Hours of autonomous work |

**How it works:**
- **Lazy loading by default** - Tools load on-demand via search, not all at once
- **Auto-enabled** - When MCP tools exceed 10% of context window
- **SpecWeave's 24 plugins** discovered only when keywords match
- **Skills activate on demand** - Architecture, PM, TDD skills load when needed

**No configuration needed** - enabled by default. [Learn more about Tool Search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool).

### Lazy Plugin Loading (NEW)

**99% token savings** for non-SpecWeave work with our router-based architecture:

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Non-SpecWeave work | ~60k tokens | ~500 tokens | **99%** |
| SpecWeave work | ~60k tokens | ~60k (on-demand) | 0% |
| Mixed session | ~60k tokens | ~30k avg | **50%** |

**How it works:**
- **Router skill** (~500 tokens) installed by default - detects SpecWeave intent from keywords
- **On-demand loading** - Full plugins hot-reload when you mention "increment", "spec.md", "living docs", etc.
- **Context forking** - Heavy skills (PM, Architect) run in isolated sub-agents via `context: fork`
- **Skills cache** at `~/.specweave/skills-cache/` - instant activation without network latency

**Keywords that trigger full loading:** `increment`, `specweave`, `/sw:`, `spec.md`, `tasks.md`, `living docs`, `feature planning`, `sprint`, `jira sync`, `github sync`

**New installations** automatically use lazy loading. For existing installations:

```bash
specweave migrate-lazy      # Convert to lazy mode (with backup)
specweave migrate-lazy --rollback  # Restore if needed
```

**Manual plugin control (Claude's native commands - RECOMMENDED):**

```bash
# Install plugins using SHORT names from marketplace.json
claude plugin install sw@specweave           # Core framework
claude plugin install sw-frontend@specweave  # Frontend development
claude plugin install sw-github@specweave    # GitHub integration

# List/manage installed plugins
claude plugin list                           # Show all installed
claude plugin enable sw-frontend@specweave   # Enable plugin
claude plugin disable sw-frontend@specweave  # Disable plugin
```

**Full install mode** (skip lazy loading):

```bash
specweave init --full .    # Install all plugins immediately
```

### Claude Code 2.1.x Optimizations

SpecWeave leverages the latest Claude Code features for maximum performance:

| Feature | Benefit |
|---------|---------|
| **`context: fork`** | Heavy skills (PM, Architect) run in isolated sub-agents |
| **`model: opus`** | Critical decisions use Opus for highest quality |
| **Skill-scoped hooks** | ~50% fewer hook invocations (fire only when skill active) |
| **Agent-type init** | Agent-specific startup context and messages |

```yaml
# Example: SpecWeave skills use modern frontmatter
---
name: pm
description: Product Manager expertise...
context: fork       # Isolated execution
model: opus         # Quality guarantee
hooks:              # Skill-scoped hooks
  PostToolUse:
    - matcher: Edit
      hooks:
        - type: command
          command: bash hooks/v2/guards/task-ac-sync-guard.sh
---
```

### Built on Industry Standards

Anthropic doesn't just use standards — they **define** them. SpecWeave builds on:

| Standard | What It Does |
|----------|--------------|
| **[MCP](https://modelcontextprotocol.io)** | Model Context Protocol — adopted by OpenAI, Google, Microsoft |
| **[Agent Skills](https://agentskills.io)** | Open format for reusable AI capabilities across agent products |
| **Plugin Architecture** | Skills, agents, hooks pattern — becoming the standard for AI dev tools |

**Learn SpecWeave = Learn the future.** Your skills are portable across any agent that supports these standards.

---

## Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "feature"` | Create spec + plan + tasks |
| `/sw:auto` | **Ship while you sleep** - hours of autonomous work |
| `/sw:auto-status` | Check autonomous session progress |
| `/sw:do` | Execute one task at a time |
| `/sw:done 0001` | Close with quality validation |
| `/sw:sync-progress` | Push to GitHub/JIRA/ADO |
| `/sw:cancel-auto` | Stop autonomous session |

### CLI Commands

| Command | Purpose |
|---------|---------|
| `specweave update` | **Full update**: CLI (self-update via npm), instructions, config |
| `specweave update --plugins` | Update + refresh marketplace plugins |
| `specweave refresh-marketplace` | Reinstall plugins from GitHub |
| `specweave init .` | Initialize project |

**[53 total commands ->](https://spec-weave.com/docs/commands/overview)**

---

## Works On Everything

| Scenario | What You Do |
|----------|-------------|
| **10-year legacy codebase** | `specweave init .` -> brownfield analysis detects doc gaps |
| **Weekend MVP** | `specweave init .` -> `/sw:increment "Build auth"` |
| **50-team enterprise** | `specweave init .` -> `/sw:enable-multiproject` -> maps to JIRA/ADO |

---

## Requirements

- **Node.js 20.12.0+** (we recommend Node.js 22 LTS) — [upgrade guide](https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error)
- Any AI coding tool: Claude Code, Cursor, Windsurf, Cline, Aider, etc.
- Git repository

> **Why Node.js 20.12.0+?** SpecWeave uses modern JavaScript features (ES2022 Import Attributes) that require Node.js 20.12.0 or higher. If you see `SyntaxError: Unexpected token 'with'`, you need to upgrade Node.js.

---

## Community

[Documentation](https://spec-weave.com) | [Discord](https://discord.gg/UYg4BGJ65V) | [YouTube](https://www.youtube.com/@antonabyzov) | [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

---

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
