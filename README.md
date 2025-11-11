# SpecWeave

> **1 Senior Developer = Full Engineering Team**

The framework that turns solo builders into unicorn-level engineering teams.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/test.yml?branch=develop&label=Tests)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/e2e-smoke-test.yml?branch=develop&label=E2E)](https://github.com/anton-abyzov/specweave/actions/workflows/e2e-smoke-test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join_Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

---

## 📊 Engineering Metrics (DORA)

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Lead Time](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=h&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Change Failure Rate](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![MTTR](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=min&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)

**SpecWeave builds SpecWeave using SpecWeave.** These are real metrics from our own development.

**[→ Live Dashboard](https://spec-weave.com/docs/metrics)** | **[→ Detailed Report](https://github.com/anton-abyzov/specweave/blob/develop/metrics/dora-report.md)**

---

## 🦄 The Solo Builder Revolution

**The Truth Nobody Talks About:**
- **Stripe:** Started with 2 engineers
- **Instagram:** 1 engineer (Kevin Systrom) until 100M users
- **WhatsApp:** 32 engineers serving 450M users (14M users per engineer!)
- **Plaid:** 3 founding engineers built a $13B company

**What they had that you don't:**
- Enterprise-grade documentation processes
- Architecture decision records (ADRs)
- Living runbooks and operational docs
- Spec-driven development discipline

**With SpecWeave:**
- ✅ **You get ALL of that** - automatically
- ✅ **You ARE the full team** - PM + Architect + QA + DevOps + Tech Writer
- ✅ **You CAN build unicorns** - solo, with enterprise-grade quality

### What This Replaces:

| Role | Annual Cost | SpecWeave Replacement |
|------|-------------|----------------------|
| Product Manager | $150K | Auto-generated PRDs + User Stories |
| System Architect | $180K | Auto-generated ADRs + HLD |
| Tech Writer | $100K | Living docs auto-sync |
| QA Lead | $130K | BDD tests embedded |
| DevOps Engineer | $150K | Production runbooks included |
| **Total Team Cost** | **$710K/year** | **$0** (free framework) |

**ROI:** ♾️ (infinite)

**You're not hiring a team. You're automating one.** 🚀

---

## If You Get Hit By A Bus

Your startup dies with you.

Every architecture decision. Every API choice. Every "weird workaround because..."

All in your head. Zero documentation.

**AI made you 10x faster at digging your own grave.**

---

## Want to Scale? Get Enterprise-Ready.

You can't land Fortune 500 clients with tribal knowledge.
You can't pass SOC2 audit with "ask Dave."
You can't sell your startup when the codebase is a mystery.

**The companies making REAL money?**
- They have **PRDs** (Product Requirements)
- They have **ADRs** (Architecture Decision Records)
- They have **HLDs** (High-Level Design docs)
- They have **runbooks** (How to actually run this)

This isn't bureaucracy. **This is how you get paid.**

But for solo devs and small teams? Impossible to maintain manually.

---

## SpecWeave: Enterprise Standards, Solo Builder Capability

**The Power Formula:**
```
1 Senior + SpecWeave + Claude Code = Full Engineering Team
```

Living documentation that updates automatically after every task.
The same processes Fortune 500 uses. Without the team. Without the manual work.

### For Juniors:
- ✅ **Code like seniors** - Enterprise patterns from day one
- ✅ **Think like architects** - ADRs teach you system design
- ✅ **Test like QA leads** - BDD embedded in every task

### For Seniors:
- ✅ **Build like unicorns** - Solo founder → Unicorn-level product
- ✅ **Ship enterprise-grade** - Pass SOC2, land Fortune 500 deals
- ✅ **Replace entire teams** - PM + Architect + QA + DevOps + Tech Writer

### For CTOs:
- ✅ **Manage without meetings** - Docs are source of truth
- ✅ **Scale without chaos** - Standards enforced automatically
- ✅ **Audit-ready always** - ISO, SOC2, compliance built-in

**AI speed + Enterprise reliability + Solo capability = Infinite leverage** 🚀

---

## Works for Both

**🌱 Greenfield** (New Projects)
- Start with best practices from day one
- Spec-driven development from the beginning
- Clean, documented, maintainable

**🏭 Brownfield** (Existing Projects)
- Import docs from Notion, Confluence, Wiki
- AI-powered classification (85%+ accuracy)
- Gradual migration without disruption

**[→ Brownfield Import Guide](https://spec-weave.com/docs/workflows/brownfield)**

---

## Quick Start

### Greenfield (New Project)
```bash
# Install SpecWeave
npm install -g specweave

# Initialize new project
specweave init my-project
cd my-project

# Start building
/specweave:increment "User authentication"  # Plan increment
/specweave:do                               # Implement tasks
/specweave:done 0001                        # Complete increment
```

### Brownfield (Existing Project)
```bash
# Initialize SpecWeave in existing project
cd my-existing-project
specweave init .

# Import existing docs
/specweave:import-docs ~/Downloads/notion-export --source=notion

# Continue normally
/specweave:increment "Add dark mode"
```

**[→ Complete Quickstart Guide](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Real-World Example

**Scenario**: Building authentication for SaaS app

```bash
# 1. Plan increment (PM Agent creates spec with user stories)
/specweave:increment "User authentication with OAuth"

# Result:
# ✅ spec.md - User stories, acceptance criteria
# ✅ plan.md - Architecture, implementation steps
# ✅ tasks.md - Tasks with embedded tests (BDD format)

# 2. Implement (auto-pauses if blocked, resumes when ready)
/specweave:do

# While you work:
# - Living docs sync automatically after each task
# - Tests embedded in tasks guide implementation
# - ADRs document "why we chose X over Y"
# - GitHub issues auto-sync (optional)

# 3. Complete (Quality Judge validates)
/specweave:done 0001

# Result:
# ✅ Code implemented
# ✅ Tests passing (90% coverage)
# ✅ Docs synced (ADRs, HLDs, runbooks)
# ✅ GitHub issues updated
# ✅ New dev can onboard in 1 hour (not 1 week!)
```

---

## Key Features

- 🧪 **Test-Aware Planning** - Embedded tests in BDD format (Given/When/Then)
- 🎯 **Disciplined Progress** - Can't start increment N+1 until N is DONE
- ⏸️ **Intelligent Pausing** - Auto-detects blockers, pauses with context, resumes when ready
- 📚 **Living Documentation** - Auto-updates after every task (no manual sync!)
- 🤖 **AI Agents** - PM, Architect, Quality Judge guide your work
- 🌍 **Multilingual** - Work in 11 languages (FREE translation)
- 🏢 **Multi-Project** - Organize by team/repo/microservice
- 🔗 **Issue Tracker Sync** - GitHub, Jira, Azure DevOps integration

**[→ Complete Feature List](https://spec-weave.com/docs/overview/features)**

---

## 📖 Documentation

**Complete guides, tutorials, and API reference:**

### **[spec-weave.com](https://spec-weave.com)**

**Start here:**
- 🚀 [Quickstart Guide](https://spec-weave.com/docs/guides/getting-started/quickstart) - 5-minute setup
- 📘 [Complete Workflow](https://spec-weave.com/docs/workflows/overview) - End-to-end journey
- 📋 [Commands Reference](https://spec-weave.com/docs/commands/status-management) - All commands
- ❓ [FAQ](https://spec-weave.com/docs/faq) - Common questions

---

## Community

- 💬 **[Discord](https://discord.gg/UYg4BGJ65V)** - Get help, share tips
- 🎥 **[YouTube](https://www.youtube.com/@antonabyzov)** - Tutorials, demos
- 🐛 **[GitHub Issues](https://github.com/anton-abyzov/specweave/issues)** - Report bugs
- 💡 **[Discussions](https://github.com/anton-abyzov/specweave/discussions)** - Q&A, feature requests

---

## Contributing

```bash
# Setup
git clone https://github.com/anton-abyzov/specweave.git
cd specweave
npm install && npm run build

# Test
npm test
```

**[→ Contributor Guide](https://spec-weave.com/docs/guides/contributing)**

---

## Best with Claude Code

SpecWeave works best with **[Claude Code](https://claude.com/claude-code)** (native plugins, auto-activating skills, lifecycle hooks).

Also works with: Cursor, GitHub Copilot, ChatGPT (manual workflow).

**[→ Tool Comparison](https://spec-weave.com/docs/overview/features#claude-code-native)**

---

## License

MIT - [github.com/anton-abyzov/specweave](https://github.com/anton-abyzov/specweave)

---

**Get started**: `npm install -g specweave` → **[Read the Docs](https://spec-weave.com)**
