# SpecWeave

**AI-Native Spec-Driven Development Framework**

Turn vague ideas into production-ready code with enterprise-grade documentation—automatically.

[![NPM Version](https://img.shields.io/npm/v/specweave?color=blue)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)

---

## The Problem

You're building fast with AI. But:
- Documentation is non-existent
- Architecture decisions are lost in chat history
- Tests are an afterthought
- GitHub/JIRA updates are manual busywork
- New team members need weeks to onboard

**Result**: Technical debt from day one.

## The Solution

SpecWeave makes AI **spec-driven**:

```
Idea → Spec → Plan → Tasks → Code → Docs (all auto-generated and synced)
```

Every feature gets: user stories, acceptance criteria, architecture decisions, embedded tests, and auto-updating documentation.

---

## Quick Start

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/specweave:increment "User authentication with OAuth"  # Plan
/specweave:do                                          # Implement
/specweave:done 0001                                   # Complete
```

**[Full Quickstart Guide →](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## What You Get

| Before | After SpecWeave |
|--------|-----------------|
| "It's in my head" | Living docs auto-sync |
| Manual JIRA updates | AI updates GitHub/JIRA/ADO |
| Tests? Later... | BDD tests embedded in tasks |
| Tribal knowledge | Searchable specs + ADRs |
| Onboarding: 2 weeks | Onboarding: 1 day |

---

## Key Features

**Structured Development**
- `/specweave:increment` → AI generates spec.md, plan.md, tasks.md
- WIP limits enforce focus (1 active increment at a time)
- Three-file structure: WHAT (spec) → HOW (plan) → DO (tasks)

**Living Documentation**
- Specs auto-sync after every task completion
- Architecture Decision Records (ADRs) captured
- Runbooks and SLOs generated

**External Tool Sync**
- **GitHub Issues**: Three-permission sync (create, update, status)
- **JIRA**: Epic/Story hierarchy sync
- **Azure DevOps**: Work item integration
- Choose your sync direction per project

**AI Orchestration**
- PM Agent → Architect Agent → Tech Lead Agent
- Quality gates between phases
- Auto-validates completion

**Multi-Project Support**
- Monorepo and multi-repo setups
- Profile-based sync (different repos per project)
- Project-aware task routing

---

## Workflow

```mermaid
graph LR
    A[/specweave:increment] -->|PM Agent| B[spec.md]
    B -->|Architect Agent| C[plan.md]
    C -->|Planner| D[tasks.md]
    D -->|/specweave:do| E[Implementation]
    E -->|Hooks| F[Auto-sync Docs]
    F -->|/specweave:done| G[Complete]
```

---

## Strategic Init

New project? SpecWeave guides you through 6 research phases:

1. **Vision & Market** - What are you building?
2. **Scaling Goals** - Expected users, services
3. **Compliance** - Auto-detects 30+ standards (HIPAA, SOC2, GDPR...)
4. **Budget** - Cloud credits eligibility
5. **Methodology** - Agile or Waterfall
6. **Repositories** - Multi-repo selection

**Result**: Architecture recommendations, team sizing, cost estimates.

---

## Greenfield & Brownfield

**New Projects**: Start spec-driven from day one.

**Existing Projects**:
```bash
specweave init .
/specweave:import-docs ~/exports/notion --source=notion
```
Import from Notion, Confluence, GitHub Wiki. AI classifies docs automatically.

---

## Commands

| Command | Purpose |
|---------|---------|
| `/specweave:increment "feature"` | Plan new increment |
| `/specweave:do` | Execute tasks |
| `/specweave:done 0001` | Complete increment |
| `/specweave:progress` | Show status |
| `/specweave:validate 0001` | Quality check |
| `/specweave:sync-progress` | Sync to external tools |

**[Full Command Reference →](https://spec-weave.com/docs/commands/overview)**

---

## Requirements

- Node.js 20+
- Claude Code (recommended) or compatible AI assistant
- Git repository

---

## Integrations

| Platform | Status |
|----------|--------|
| GitHub Issues | Production |
| JIRA | Production |
| Azure DevOps | Production |
| Linear | Coming Q1 2026 |

---

## Community

- **[Discord](https://discord.gg/UYg4BGJ65V)** - Get help, share tips
- **[Documentation](https://spec-weave.com)** - Full guides
- **[GitHub Issues](https://github.com/anton-abyzov/specweave/issues)** - Bug reports
- **[YouTube](https://www.youtube.com/@antonabyzov)** - Tutorials

---

## Contributing

```bash
git clone https://github.com/anton-abyzov/specweave.git
cd specweave
npm install && npm run build
npm test
```

**[Contributor Guide →](https://spec-weave.com/docs/guides/contributing)**

---

## License

MIT - [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)

---

**Stop vibe-coding. Start spec-coding.**

```bash
npm install -g specweave
```
