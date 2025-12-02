# SpecWeave

**Finally. A Framework That Works on Legacy, Startup, AND Enterprise.**

*Drop it into a 10-year-old codebase — it understands everything. Use it on your weekend MVP — specs write themselves. Scale it to 50 teams — JIRA, GitHub, Azure DevOps sync automatically.*

[![NPM Version](https://img.shields.io/npm/v/specweave?color=blue)](https://www.npmjs.com/package/specweave)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Discord](https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Tutorials-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

---

## 🔄 Built With SpecWeave (Dogfooding)

> **SpecWeave is 100% built using SpecWeave.** Every feature, every bug fix, every release — all spec-driven.

This isn't just a framework we made — it's the framework we use every day. Our entire development workflow runs on SpecWeave:
- **60+ completed increments** with full specs, plans, and tasks
- **Living docs** that auto-update after every task
- **DORA metrics** tracking real delivery performance

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Lead Time](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=h&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Change Failure Rate](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![MTTR](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/.specweave/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=min&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)

**[→ Live Dashboard](https://spec-weave.com/docs/metrics)** | **[→ Detailed Report](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/metrics/dora-report.md)** | **[→ Browse Our Increments](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments)**

---

## Why Not BMAD or SpecKit?

Great tools for simple greenfield projects. But when things get real:

- **BMAD** — Constant role-switching (PM → Architect → Dev). Multi-step prompts for every action. Works until you have 5+ services or existing documentation.
- **[SpecKit](https://github.com/github/spec-kit)** — GitHub's excellent open-source toolkit (28k+ stars, Sept 2025). Same 4-phase workflow (Specify → Plan → Tasks → Implement). Clean and minimal — perfect for single-project greenfield MVPs.
- **Both** — Break down with legacy codebases, multi-repo setups, existing documentation sprawl, and enterprise compliance requirements.

### SpecKit → SpecWeave: The Mathematical Relationship

**SpecKit is a particular case of SpecWeave** — specifically, it's equivalent to creating ONE SpecWeave increment with no lifecycle management afterward:

```
SpecKit output    ≡  ONE SpecWeave increment (spec.md + plan.md + tasks.md)
SpecWeave         =  N increments + lifecycle + external sync + living docs + hooks
```

In set theory terms: **SpecKit ⊂ SpecWeave** — every SpecKit capability exists in SpecWeave, but SpecWeave adds the enterprise layer:

| Capability | SpecKit | SpecWeave |
|------------|---------|-----------|
| **Workflow** | Specify → Plan → Tasks → Implement | Same + living docs + hooks + quality gates |
| **Projects** | Single project | Multi-project, multi-repo, umbrella setups |
| **External Tools** | None | GitHub Issues, JIRA, Azure DevOps (bidirectional) |
| **Documentation** | Snapshot (static specs) | Living docs (auto-update after every task) |
| **Codebase Type** | Greenfield only | Greenfield + Brownfield (10-year legacy? Fine.) |
| **Team Scale** | Solo/small team | Solo to 50+ teams |
| **Quality Gates** | None | 3-gate validation (tasks, tests 60%+, docs) |
| **Plugin Ecosystem** | Minimal | Hooks, skills, agents, multi-AI support |

**SpecWeave** — Drop into any codebase. Sync with JIRA/GitHub/ADO. Handle 50 teams or solo MVPs. One workflow.

---

## What Makes SpecWeave Different

Every AI coding tool promises productivity. But after the chat ends:

- **Your specs disappear** into chat history
- **Your architecture decisions are forgotten**
- **Your tests are never written**
- **Your GitHub/JIRA stays outdated**
- **New team members start from zero**

**SpecWeave is the only framework where AI decisions become permanent, searchable documentation.**

<p align="center">
  <img src="https://raw.githubusercontent.com/anton-abyzov/specweave/develop/docs-site/static/img/specweave-flow.svg?v=2" alt="SpecWeave Flow: Your Idea → Spec → Plan → Tasks → Code → Living Docs" width="800"/>
</p>

---

## The Workflow

<p align="center">
  <img src="https://raw.githubusercontent.com/anton-abyzov/specweave/develop/docs-site/static/img/workflow-diagram.svg" alt="SpecWeave Workflow: Command → AI Agents → Permanent Files → Build → Auto-Sync" width="700"/>
</p>

---

## Quick Start

```bash
npm install -g specweave
cd your-project
specweave init .
```

Then in Claude Code:
```bash
/specweave:increment "Add dark mode toggle"  # AI creates spec + plan + tasks
/specweave:do                                # Autonomous implementation
/specweave:done 0001                         # Quality-validated completion
```

**Pro tip**: Use `/specweave:next` to flow through the entire cycle. One command auto-closes completed work and suggests what's next — review specs/tasks when needed, otherwise just keep clicking "next".

**[Full Quickstart Guide](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Key Strengths

- **Legacy to Enterprise** — 10-year-old monolith? Startup MVP? 50-team enterprise? Works on all.
- **Any AI, Your Choice** — Claude, GPT, Gemini, Copilot — your team uses whatever they prefer
- **Real Bidirectional Sync** — JIRA/GitHub/ADO update when you work. You update when they change.
- **Living Documentation** — Specs auto-update after every task. Never stale. Never manual.
- **Multi-Project Mode** — Multiple repos, multiple teams, one source of truth
- **3-Gate Quality Validation** — Nothing ships without passing tasks, tests (60%+), and docs
- **70%+ Token Reduction** — Progressive loading means your AI stays fast and focused

---

## External Tool Integration

SpecWeave keeps your project management tools in sync **automatically**:

<p align="center">
  <img src="https://raw.githubusercontent.com/anton-abyzov/specweave/develop/docs-site/static/img/external-sync-diagram.svg" alt="SpecWeave External Tool Integration: Sync with GitHub, JIRA, Azure DevOps" width="800"/>
</p>

| Platform | Capabilities |
|----------|--------------|
| **GitHub Issues** | Create, update, close, progress sync, checkbox tracking |
| **JIRA** | Epic/Story hierarchy, status sync, custom fields |
| **Azure DevOps** | Work items, area paths, status sync |
| **Linear** | Coming Q1 2026 |

---

## What You Get

| Before | After SpecWeave |
|--------|-----------------|
| Specs in chat history | **Permanent, searchable specs** |
| Manual JIRA/GitHub updates | **Auto-sync on every task** |
| Tests? Maybe later... | **Tests embedded in tasks (60%+ enforced)** |
| Architecture in your head | **ADRs captured automatically** |
| "Ask John, he knows" | **Living docs, always current** |
| Onboarding: 2 weeks | **Onboarding: 1 day** |

---

## The Three-File Foundation

Every feature generates three permanent files:

```
.specweave/increments/0001-dark-mode/
├── spec.md    ← WHAT: User stories, acceptance criteria, requirements
├── plan.md    ← HOW: Architecture, tech decisions, ADRs
└── tasks.md   ← DO: Implementation tasks with embedded tests
```

### spec.md (WHAT)
```markdown
## User Stories

### US-001: Dark Mode Toggle
As a user, I want to toggle dark mode so that I can reduce eye strain at night.

**Acceptance Criteria:**
- [x] AC-US1-01: Toggle switch in settings persists preference
- [x] AC-US1-02: Theme applies to all components instantly
- [ ] AC-US1-03: System preference detected on first visit
```

### tasks.md (DO)
```markdown
### T-001: Implement Theme Provider
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed

**Embedded Tests** (AC-US1-01):
- test_theme_toggle_persists_to_localstorage
- test_theme_applies_to_all_components
- test_toggle_updates_ui_instantly
```

---

## Key Features

### Works With ANY AI Tool

<p align="center">
  <img src="https://raw.githubusercontent.com/anton-abyzov/specweave/develop/docs-site/static/img/agents-diagram.svg" alt="SpecWeave works with Claude, GPT, Gemini, Copilot and more" width="850"/>
</p>

SpecWeave's power isn't in Claude magic. It's in **structure**.

- `spec.md` is just markdown — any AI can read it
- `tasks.md` is just markdown — any AI can update it
- Acceptance criteria are just checkboxes — universal

**Team with mixed AI tools?** Sarah uses Claude. Mike uses GPT-4. Alex uses Copilot. Everyone works on the same specs. Same tasks. Same acceptance criteria. The sync still works.

**Claude Code** gets the best experience (slash commands, hooks, skills). But any AI can participate.

### Living Documentation

Documentation updates **after every task** via hooks:
- Strategic specs sync to `.specweave/docs/`
- ADRs captured automatically
- Runbooks and SLOs generated
- No manual doc updates ever

### Quality Gates

Three gates before any increment closes:
1. **Tasks**: All tasks marked complete
2. **Tests**: 60%+ coverage minimum (configurable)
3. **Documentation**: Living docs updated

### Token Efficiency

70%+ context reduction through:
- Progressive plugin loading (load only what you need)
- Skills auto-activate based on keywords
- Context optimizer removes irrelevant specs
- Sub-agent parallelization isolates context

### Why Skills, Not MCP?

**Community insight**: Anthropic's engineering team discovered that [code execution beats direct tool calls](https://www.anthropic.com/engineering/code-execution-with-mcp) for AI agent efficiency.

**The MCP Problem**:
| Issue | Impact |
|-------|--------|
| Tool definition bloat | All tools loaded upfront → context waste |
| Data duplication | Same data flows through model 2-3× |
| Token explosion | 150,000 tokens vs 2,000 with code-first |

**SpecWeave's Approach**:
```
❌ MCP: Load 50 tools → model picks → fetch → model processes → call another
✅ Skills: Load 1 skill on-demand → Claude writes code → process locally
```

> "LLMs are adept at writing code and developers should take advantage of this strength."
> — [Anthropic Engineering](https://www.anthropic.com/engineering/code-execution-with-mcp)

**Result**: 98%+ token reduction, deterministic execution, reusable skill library.

---

## Commands Reference

| Command | Purpose |
|---------|---------|
| `/specweave:increment "feature"` | Plan new increment (PM → Architect → Tasks) |
| `/specweave:do` | Execute all tasks autonomously |
| `/specweave:done 0001` | Complete with quality gate validation |
| `/specweave:progress` | Show real-time status |
| `/specweave:validate 0001` | Run quality checks |
| `/specweave:sync-progress` | Sync to GitHub/JIRA/ADO |
| `/specweave:tdd-cycle` | Full red-green-refactor workflow |
| `/specweave:discrepancies` | View brownfield documentation gaps |
| `/specweave:discrepancy-to-increment` | Convert gaps to actionable increments |
| `/specweave:jobs` | Monitor background jobs (analysis, import) |

**[Full Command Reference](https://spec-weave.com/docs/commands/overview)**

---

## Legacy, Startup, or Enterprise — It Just Works

**10-Year-Old Legacy Codebase?**
```bash
specweave init .
# During init, choose "Run brownfield analysis" to scan for documentation gaps
# Or run manually later: /specweave:discrepancies
```

**What happens?** Brownfield analysis scans your codebase and creates **discrepancies** — actionable documentation gaps:
- `missing-docs` — Undocumented code exports
- `stale-docs` — Documentation out of sync with code
- `knowledge-gap` — Single-contributor modules (bus factor risk)
- `orphan-doc` — Docs for deleted code
- `missing-adr` — Significant patterns without ADRs

Convert discrepancies to increments:
```bash
/specweave:discrepancies                         # View all gaps
/specweave:discrepancy-to-increment DISC-0001    # Create increment from gap
```

**Fresh Startup MVP?**
```bash
specweave init .
/specweave:increment "Build user auth"  # Full spec in 60 seconds
```

**50-Team Enterprise?**
```bash
specweave init . --multiproject
# Maps to JIRA projects, ADO area paths, GitHub repos automatically
```

Import from Notion, Confluence, GitHub Wiki. AI classifies docs automatically.

---

## Requirements

- Node.js 20+
- Claude Code with **Claude Opus 4.5** (recommended) — [released Nov 2025](https://www.anthropic.com/news/claude-opus-4-5)
- Git repository

### Why Opus 4.5? 2-3x Faster Development!

With **Claude Opus 4.5**, development speed increases **2-3x** (some report **5-10x**!). The key: formulate small, well-defined increments (5-15 tasks), and Opus completes them almost **without manual interaction**. Just define requirements, run `/specweave:do`, and review what's done.

---

## Community

- **[Documentation](https://spec-weave.com)** - Full guides and tutorials
- **[Discord](https://discord.gg/UYg4BGJ65V)** - Get help, share tips
- **[YouTube](https://www.youtube.com/@antonabyzov)** - Video tutorials
- **[GitHub Issues](https://github.com/anton-abyzov/specweave/issues)** - Bug reports and features

---

## Contributing

```bash
git clone https://github.com/anton-abyzov/specweave.git
cd specweave
npm install && npm run build
npm test
```

**[Contributor Guide](https://spec-weave.com/docs/guides/contributing)**

---

## License

MIT - [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)

---

**Legacy. Startup. Enterprise. One framework that actually works everywhere.**

```bash
npm install -g specweave
```

---

*Fortune 500 companies pay millions for systems like this. This? Free. Open source.*
