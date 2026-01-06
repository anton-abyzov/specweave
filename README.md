# SpecWeave

**The AI Development Framework That Can Run for Hours Autonomously.**

*Ship features while you sleep. `/sw:auto` executes tasks, runs tests, fixes failures, and syncs to GitHub/JIRA — completely hands-off. Mobile apps, microservices, multi-repo architectures — one framework handles it all.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Tutorials-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

```bash
# Requires Node.js 20.12.0+ (we recommend Node.js 22 LTS)
npm install -g specweave
```

> **New in v1.0.100**: Auto mode now shows live labels in your terminal — see exactly what SpecWeave is doing: `[Planning]`, `[Implementing]`, `[Testing]`, `[Fixing]`. Hours of autonomous execution with full visibility.

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
| **Maturity** | Alpha (v6) | Stable | Built-in | **Production (v1.0.100)** |
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

### Installation

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
specweave refresh-marketplace   # Reinstall all plugins from GitHub
specweave update-instructions   # Regenerate CLAUDE.md
```

**[Full Quickstart Guide ->](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Key Features

### Autonomous Execution (v2.9)

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

### Token Efficiency

70%+ context reduction:
- Progressive plugin loading
- Skills auto-activate on keywords
- Context optimizer removes irrelevant specs

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
