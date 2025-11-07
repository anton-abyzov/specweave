# SpecWeave

> **AI made us fast. SpecWeave makes us sustainable.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/test.yml?branch=develop&label=Tests)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/e2e-smoke-test.yml?branch=develop&label=E2E)](https://github.com/anton-abyzov/specweave/actions/workflows/e2e-smoke-test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join_Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

---

## The Problem Everyone Feels But Nobody Talks About

Your AI coding assistant writes features in 30 minutes.

You spend 3 days updating documentation.

By day 4, the code has changed again.

**The docs? Already wrong.**

---

## The Dirty Secret of AI Coding

AI coding assistants made us:
- ✅ **10x faster at shipping**
- ❌ **100x worse at maintaining**

We're all "vibe coding" now. Fast. Fun. Chaotic.

No structure. No boundaries. No memory of why we built it this way.

New developers? Lost in 1 hour.

**This is not sustainable.**

---

## The Fortune 500 Gap

Big companies don't have this problem.

They have systems:
- **PRDs** (Product Requirements) - What and why
- **HLDs** (High-Level Design) - Architecture decisions
- **ADRs** (Architecture Decision Records) - Why we chose X over Y
- **Runbooks** (Operations) - How to actually run this
- **Glossaries** (Terms) - What these acronyms mean

Their docs stay updated because there's a team, a process, a **discipline**.

But for solo developers and small teams?

**Impossible to maintain manually.**

---

## What is SpecWeave?

**Fortune 500 discipline. Zero overhead. AI-native.**

SpecWeave is a spec-driven development framework that brings enterprise-grade processes to developers of any size—without the bureaucracy.

It's not just a tool. **It's a movement.**

> *"Dad, AI writes your code but you update docs MANUALLY?"*
> — My 14-year-old daughter (who was absolutely right)

**The new way:**
- Living docs that ACTUALLY stay synced (automatically)
- Complete knowledge system (PRDs, HLDs, ADRs, glossaries, runbooks)
- Tests embedded in tasks (BDD format, full traceability)
- Enterprise structure without enterprise overhead
- **Vibe coding... but with boundaries**

---

## What Changes

**BEFORE (Vibe Coding):**
- "I think we used JWT tokens?"
- "Why did we choose PostgreSQL again?"
- "What does this acronym mean?"
- New developer: **Lost in 1 hour**

**AFTER (SpecWeave):**
- Check ADR-003: JWT vs Session Tokens (we chose JWT, here's why)
- Check HLD: Database section (Postgres for ACID compliance)
- Check Glossary: All technical terms defined
- New developer: **Productive in 1 hour**

---

## 📊 Engineering Metrics (DORA)

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Lead Time](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=h&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Change Failure Rate](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![MTTR](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=min&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)

**Updated Daily** | [📊 Detailed Report](https://github.com/anton-abyzov/specweave/blob/develop/metrics/dora-report.md) | [📈 Metrics Breakdown](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md) | [🌐 Dashboard](https://spec-weave.com/docs/metrics) | [⚙️ Workflow](https://github.com/anton-abyzov/specweave/actions/workflows/dora-metrics.yml)

---

## 📖 Full Documentation

**For complete guides, tutorials, and API reference:**

### **[spec-weave.com](https://spec-weave.com)**

---

## Quick Start

```bash
# Install SpecWeave CLI
npm install -g specweave

# Initialize your project
specweave init my-project
cd my-project

# Start building - SpecWeave guides you through the entire workflow
/specweave:increment "User authentication"  # Plan increment
/specweave:do                               # Implement tasks (auto-pauses if blocked, auto-resumes when ready)
/specweave:done 0001                        # Complete increment
```

**New to SpecWeave?** → **[Getting Started Guide](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Key Features

### 🧪 Test-Aware Planning
Embedded test plans in every task with BDD format (Given/When/Then) for clarity

### 🎯 Disciplined Progress
Cannot start increment N+1 until N is DONE - enforces completion before moving forward

### ⏸️ Intelligent Status Management
Automatically detects when you're blocked (missing API keys, waiting for approval), pauses work with clear context, and resumes when ready - no manual intervention needed

### 📚 Living Documentation
Auto-updates after every task via Claude Code hooks - never outdated

### 🤖 Intelligent Agents
PM Agent, Architect, test-aware-planner, Quality Judge - specialized AI agents guide you


### 🌍 Multilingual Support ($0 Cost!)

Work in 11 languages with **FREE zero-cost translation**:

- **Primary Approach**: In-session translation (FREE, works with any model)
- **Optional Approach**: Automated hooks (convenience, ~$0.003/increment)
- **11 Languages**: English, Russian, Spanish, Chinese, German, French, Japanese, Korean, Portuguese, Arabic, Hebrew
- **Any Model**: Claude, GPT-4, Gemini, DeepSeek, and more
- **Any Tool**: Claude Code, Cursor, Copilot, ChatGPT

**Zero API costs** - uses your current conversation context for translation!

---

## Enterprise Features

### 🏢 Multi-Project Support (v0.8.0+)

Organize documentation by team, repo, or microservice:

- **Team-Based Organization**: Frontend, Backend, Mobile, Platform teams with separate documentation
- **Microservices Architecture**: Each service gets its own specs, modules, and team playbooks
- **Per-Project Sync**: Link projects to different GitHub repos, JIRA projects, or ADO boards
- **Unified Architecture**: Single project = multi-project with 1 project (NO special cases!)

**Five Documentation Types Per Project**:
1. **specs/** - Living documentation specs (user stories, AC)
2. **modules/** - Module/component documentation (architecture, APIs)
3. **team/** - Team playbooks (onboarding, conventions, workflows)
4. **architecture/** - Project-specific ADRs (optional)
5. **legacy/** - Brownfield imports (temporary)

**[→ Multi-Project Setup Guide](https://spec-weave.com/docs/guides/multi-project-setup)**

### 🔗 Issue Tracker Integration (v0.9.0+)

**Strategy-based team mapping** adapts to your organization's structure:

#### **GitHub - 3 Strategies**

1. **Repository-per-team** (Most Common)
   ```bash
   GITHUB_STRATEGY=repository-per-team
   GITHUB_REPOS=frontend-app,backend-api,mobile-app
   ```
   Best for: Microservices, independent deployments

2. **Team-based** (Monorepo)
   ```bash
   GITHUB_STRATEGY=team-based
   GITHUB_REPO=main-product
   GITHUB_TEAMS=frontend-team,backend-team
   ```
   Best for: Monorepos (Nx, Turborepo, Lerna)

3. **Team-multi-repo** (Platform Teams)
   ```bash
   GITHUB_STRATEGY=team-multi-repo
   GITHUB_TEAM_REPO_MAPPING='{"platform-team":["api-gateway","auth"]}'
   ```
   Best for: Platform teams owning multiple services

#### **Jira - 3 Strategies**

1. **Project-per-team** - Separate projects for each team
2. **Component-based** - One project with components
3. **Board-based** - One project with filtered boards

#### **Azure DevOps - Team-Based**

Fixed hierarchy: Organization → Project (ONE) → Teams (multiple)
```bash
AZURE_DEVOPS_PROJECT=MyProject
AZURE_DEVOPS_TEAMS=Frontend,Backend,Mobile
```

**[→ Complete Integration Guide](https://spec-weave.com/docs/integrations/issue-trackers)**

### 📦 Brownfield Import

Import existing documentation from external sources:

- **Automatic Classification**: AI-powered keyword detection (85%+ accuracy)
- **Supported Sources**: Notion, Confluence, GitHub Wiki, custom markdown folders
- **Smart Organization**: Classifies into specs, modules, team docs, or legacy
- **Migration Reports**: Complete audit trail with confidence scores and manual review checklist

**Example**:
```bash
# Import Notion export to web-app project
/specweave:import-docs ~/Downloads/notion-export --source=notion --project=web-app

# Result:
# ✅ Classified 127 files
#    - 37 specs → projects/web-app/specs/
#    - 18 modules → projects/web-app/modules/
#    - 12 team docs → projects/web-app/team/
#    - 60 legacy → projects/web-app/legacy/notion/
```

**[→ Brownfield Integration Guide](https://spec-weave.com/docs/workflows/brownfield)**

---

## Documentation Hub

**Learn SpecWeave:**
- 📘 [What is SpecWeave?](https://spec-weave.com/docs/overview/introduction)
- 🚀 [Quickstart Guide](https://spec-weave.com/docs/guides/getting-started/quickstart)
- 🏗️ [Complete Workflow Journey](https://spec-weave.com/docs/workflows/overview)
- ❓ [FAQ - Common Questions](https://spec-weave.com/docs/faq)

**Commands & API:**
- 📋 [Commands Reference](https://spec-weave.com/docs/commands/status-management)
- 🔧 [API Documentation](https://spec-weave.com/docs/api)

**Advanced Topics:**
- 📊 [DORA Metrics Dashboard](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md) - Actual SpecWeave performance data
- 🏢 [Brownfield Integration](https://spec-weave.com/docs/workflows/brownfield)
- 🌍 [Multilingual Support](https://spec-weave.com/docs/tutorial-extras/multilingual-support)
- 🔗 [GitHub Actions Setup](https://spec-weave.com/docs/guides/github-action-setup)

---

## Community & Support

**Join the Community:**

- 💬 **[Discord Server](https://discord.gg/UYg4BGJ65V)** - Get help, share tips, discuss features
- 🎥 **[YouTube Channel](https://www.youtube.com/@antonabyzov)** - Tutorials, demos, deep dives
- 📖 **[Documentation](https://spec-weave.com)** - Complete guides and API reference
- 🐛 **[GitHub Issues](https://github.com/anton-abyzov/specweave/issues)** - Bug reports and feature requests
- 💡 **[GitHub Discussions](https://github.com/anton-abyzov/specweave/discussions)** - Q&A and community discussions

**Need Help?**
1. Check the **[FAQ](https://spec-weave.com/docs/faq)** first
2. Ask in **[Discord](https://discord.gg/UYg4BGJ65V)** for quick answers
3. Create a **[GitHub Discussion](https://github.com/anton-abyzov/specweave/discussions)** for detailed questions

---

## Contributing

**Development Setup:**

```bash
# Clone and setup
git clone https://github.com/anton-abyzov/specweave.git
cd specweave
npm install
npm run build

# Run tests
npm test
```

**To Contribute:**
1. Fork repository
2. Create feature branch: `git checkout -b features/002-new-feature`
3. Follow SpecWeave conventions (see CLAUDE.md)
4. Add tests (minimum 3 test cases)
5. Create PR to `develop` branch

**[→ Contributor Guide](https://spec-weave.com/docs/guides/contributing)**

---

## Best Results with Claude Code

SpecWeave gives **best results with Claude Code** due to unique capabilities:

- ✅ **Native Plugin Marketplace** - Skills and agents auto-activate (no manual setup)
- ✅ **Auto-Activating Skills** - Context-aware activation (no @ mentions)
- ✅ **Isolated Agent Contexts** - True multi-agent role separation
- ✅ **Pre/Post Lifecycle Hooks** - Automated living docs sync after every task
- ✅ **MCP Protocol** - Industry standard for context management

**Also works with**: Cursor, GitHub Copilot, ChatGPT (with manual workflow, reduced automation)

**[→ Tool Comparison](https://spec-weave.com/docs/overview/features#claude-code-native)**

---

## Status & License

**Status**: Beta - Ready for testing and contributions
**License**: MIT
**Repository**: [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)

---

## Acknowledgments

SpecWeave is inspired by:
- [spec-kit](https://github.com/github/spec-kit) - GitHub's specification toolkit
- [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) - Agentic agile framework
- [Claude Code](https://claude.com/claude-code) - Anthropic's native plugin system
- [C4 Model](https://c4model.com/) - Software architecture diagrams

---

**SpecWeave** - AI made us fast. SpecWeave makes us sustainable.

**Get started**: `npm install -g specweave` → `specweave init my-project` → **[Read the Docs](https://spec-weave.com)**
