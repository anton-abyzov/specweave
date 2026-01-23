# SpecWeave

**The Enterprise Layer for AI Coding.**

*Permanent memory, GitHub/JIRA sync, quality gates, autonomous execution. Ship features while you sleep.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Tutorials-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

```bash
npm install -g specweave   # Requires Node.js 20.12.0+
```

---

## Quick Demo

```bash
/sw:increment "User authentication"
/sw:auto                              # Ship while you sleep
```

**What happens:**
- AI creates spec + plan + tasks
- Executes autonomously for **hours**
- Tests, fixes failures, syncs to GitHub/JIRA
- You review finished work

```
[08:23:41] [Planning]      Analyzing T-003: Implement refresh token rotation
[08:24:12] [Implementing]  Writing src/auth/token-manager.ts
[08:25:33] [Testing]       Running tests... FAILED
[08:25:47] [Fixing]        Adjusting implementation...
[08:26:15] [Testing]       Re-running... PASSED
[08:26:22] [Done]          T-003 complete. Moving to T-004...
```

---

## Why SpecWeave?

Every AI coding tool loses context when the chat ends. SpecWeave creates **permanent documentation**:

```
.specweave/increments/0001-oauth/
├── spec.md    <- WHAT: User stories, acceptance criteria
├── plan.md    <- HOW: Architecture decisions, tech choices
└── tasks.md   <- DO: Implementation tasks with tests
```

**After 6 months**: Search "OAuth" → find exact decisions, who approved, why it was built that way.

---

## Key Differentiators

### Lazy Plugin Loading (99% Token Savings)

SpecWeave loads plugins **on-demand** based on your prompt keywords:

| Scenario | Without Lazy Loading | With Lazy Loading |
|----------|---------------------|-------------------|
| Non-SpecWeave work | ~60k tokens | ~500 tokens |
| SpecWeave work | ~60k tokens | ~60k (when needed) |

Say "React frontend" → frontend plugin loads. Say "Kubernetes deploy" → k8s plugin loads. No manual configuration.

### Self-Improving Skills

SpecWeave learns from corrections. When you fix something, it captures the learning:

```markdown
## Skill Memories
<!-- Auto-captured by SpecWeave reflect -->
- Always use `vi.hoisted()` for ESM mocking in Vitest 4.x+
- Prefer native `fs` over fs-extra in new code
```

Next time, it won't make the same mistake.

### Structured Documentation (No Root Bloat)

Everything stays organized in `.specweave/`:

```
.specweave/
├── increments/####-name/     # Feature specs + tasks
├── docs/internal/            # Living documentation
│   ├── architecture/adr/     # Architecture Decision Records
│   └── specs/                # Feature specifications
└── config.json               # Project configuration
```

Your project root stays clean. No scattered markdown files.

### 15+ AI Agents Working Together

| Agent | Role |
|-------|------|
| **PM** | Requirements, user stories, acceptance criteria |
| **Architect** | System design, ADRs, tech decisions |
| **QA Lead** | Test strategy, quality gates |
| **Security** | OWASP review, vulnerability scanning |
| **DevOps** | CI/CD, infrastructure, deployment |

Agents auto-activate based on context. Mention "security" → security expertise loads.

---

## Install

### Prerequisites

**Node.js 20.12.0+** required (recommend Node.js 22 LTS).

```bash
node --version   # Check version
```

> **Getting `SyntaxError: Unexpected token 'with'`?** Your Node.js is too old. [Upgrade instructions →](https://spec-weave.com/docs/guides/troubleshooting/common-errors#node-version-error)

### New Project

```bash
npm install -g specweave
mkdir my-app && cd my-app
specweave init .
```

Then describe what you want in Claude Code:
```
"Build a calculator app with React"
```

### Existing Project

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then:
```bash
/sw:increment "Add dark mode"   # Create spec + plan + tasks
/sw:auto                        # Ship while you sleep
```

---

## Core Commands

| Command | Purpose |
|---------|---------|
| `/sw:increment "feature"` | Create spec + plan + tasks |
| `/sw:auto` | Autonomous execution (hours) |
| `/sw:do` | Execute one task at a time |
| `/sw:done 0001` | Close with quality validation |
| `/sw:sync-progress` | Push to GitHub/JIRA/ADO |
| `/sw:next` | Auto-close + suggest next |

**[53 total commands →](https://spec-weave.com/docs/commands/overview)**

---

## External Integrations

| Platform | Capabilities |
|----------|--------------|
| **GitHub** | Issues, PRs, milestones, bidirectional sync |
| **JIRA** | Epics, stories, status sync |
| **Azure DevOps** | Work items, area paths |

```bash
/sw:sync-progress    # Push updates to connected tools
```

---

## Works On Everything

| Scenario | What Happens |
|----------|-------------|
| **10-year legacy codebase** | Brownfield analysis detects doc gaps |
| **Weekend MVP** | Full spec-driven development |
| **50-team enterprise** | Multi-project sync to JIRA/ADO |

---

## CLI Commands

| Command | Purpose |
|---------|---------|
| `specweave init .` | Initialize project |
| `specweave update` | **Full update**: CLI + plugins + instructions |

### Troubleshooting Commands

| Command | When to Use |
|---------|-------------|
| `specweave update` | **Use this first** - fixes 98% of issues |
| `specweave refresh-marketplace` | Plugin-only refresh (see below) |

#### About `refresh-marketplace`

Most users should use `specweave update`. The `refresh-marketplace` command exists for specific situations:

**What it does beyond native Claude Code auto-update:**
- Fixes hook permissions (`chmod +x`) - Claude Code doesn't preserve executable bits
- Manages lazy loading state (router-only installation)
- Cleans up orphaned cache/skills directories
- Updates instruction files (CLAUDE.md, AGENTS.md)

**When to use it:**
- Hooks stopped working after Claude Code update
- Skills not activating despite being installed
- Want to refresh plugins without updating CLI version

**Note:** Claude Code can auto-update marketplaces (enable via `/plugin` → Marketplaces → Enable auto-update), but it doesn't fix hook permissions or manage SpecWeave-specific state.

---

## Requirements

- **Node.js 20.12.0+** (recommend 22 LTS)
- Any AI coding tool (Claude Code recommended)
- Git repository

---

## Built With SpecWeave

> This framework builds itself. Every feature, bug fix, and release is spec-driven.

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Features](https://img.shields.io/badge/Features-140+-blue)](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)

**[Browse our increments →](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)**

---

## Documentation

**[spec-weave.com](https://spec-weave.com)** - Full documentation, guides, and examples.

---

## Community

[Discord](https://discord.gg/UYg4BGJ65V) | [YouTube](https://www.youtube.com/@antonabyzov) | [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

---

## License

MIT - [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
