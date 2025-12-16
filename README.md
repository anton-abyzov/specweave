# SpecWeave

**Finally. A Spec-Driven AI Framework That Works on Legacy, Startup, AND Enterprise.**

*Drop it into a 10-year-old codebase — it understands everything. Use it on your weekend MVP — specs write themselves. Scale it to 50 teams — JIRA, GitHub, Azure DevOps sync automatically.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=brightgreen)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Test & Validate](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml/badge.svg?branch=develop)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Tutorials-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

```bash
npm install -g specweave
```

> **v1.0.22** — [Changelog](https://github.com/anton-abyzov/specweave/releases)

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

## SpecWeave: AI Decisions Become Permanent Documentation

```bash
/sw:increment "Add OAuth authentication"  # Creates spec + plan + tasks
/sw:do                                     # AI builds autonomously
/sw:done 0001                              # Validates: tests pass, docs updated
```

**Every feature** creates three permanent files:

```
.specweave/increments/0001-oauth/
├── spec.md    ← WHAT: User stories, acceptance criteria
├── plan.md    ← HOW: Architecture decisions, tech choices
└── tasks.md   ← DO: Implementation tasks with embedded tests
```

**After 6 months**: Search "OAuth" → find exact decisions, who approved, why it was built that way.

---

## Why Not BMAD or SpecKit?

| | [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) | [SpecKit](https://github.com/github/spec-kit) | **SpecWeave** |
|---|---|---|---|
| **Status** | Alpha (v6) | Stable | **Production (v1.0.22)** |
| **Lifecycle** | Manual agent switching | Single-use specs | **Full increment lifecycle** |
| **External Sync** | None | None | **GitHub/JIRA/ADO bidirectional** |
| **Brownfield** | Limited | Greenfield only | **10-year legacy? Fine.** |
| **Documentation** | Manual | Snapshot (static) | **Living docs (auto-update)** |
| **Quality Gates** | Not built-in | None | **3-gate (tasks/tests 60%+/docs)** |
| **Dogfooding** | Unknown | Unknown | **140+ self-built features** |

**The math**: SpecKit output = ONE SpecWeave increment. SpecWeave = N increments + lifecycle + sync + hooks.

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

**[Browse our increments →](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)**

---

## Quick Start

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/sw:increment "Add dark mode"  # AI creates spec + plan + tasks
/sw:do                         # Autonomous implementation
/sw:done 0001                  # Quality-validated completion
```

**[Full Quickstart Guide →](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Key Features

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
| `/sw:do` | Execute autonomously |
| `/sw:done 0001` | Close with quality validation |
| `/sw:sync-progress` | Push to GitHub/JIRA/ADO |

**[53 total commands →](https://spec-weave.com/docs/commands/overview)**

---

## Works On Everything

| Scenario | What You Do |
|----------|-------------|
| **10-year legacy codebase** | `specweave init .` → brownfield analysis detects doc gaps |
| **Weekend MVP** | `specweave init .` → `/sw:increment "Build auth"` |
| **50-team enterprise** | `specweave init .` → `/sw:enable-multiproject` → maps to JIRA/ADO |

---

## Requirements

- Node.js 20+
- Claude Code (any model, Opus 4.5 recommended for 2-3x faster development)
- Git repository

---

## Community

[Documentation](https://spec-weave.com) | [Discord](https://discord.gg/UYg4BGJ65V) | [YouTube](https://www.youtube.com/@antonabyzov) | [GitHub Issues](https://github.com/anton-abyzov/specweave/issues)

---

## License

MIT — [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)
