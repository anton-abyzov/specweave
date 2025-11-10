# SpecWeave

> **AI made us fast. SpecWeave makes us sustainable.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/test.yml?branch=develop&label=Tests)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/e2e-smoke-test.yml?branch=develop&label=E2E)](https://github.com/anton-abyzov/specweave/actions/workflows/e2e-smoke-test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join_Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

---

## The Problem

AI coding assistants made us **10x faster at shipping**, but **100x worse at maintaining**.

Your AI writes features in 30 minutes. You spend 3 days updating docs. By day 4, the code changed again.

**The docs? Already wrong.**

---

## The Solution

**Fortune 500 discipline. Zero overhead. AI-native.**

SpecWeave brings enterprise-grade processes (PRDs, HLDs, ADRs, runbooks) to developers of any size—without the bureaucracy.

> *"Dad, AI writes your code but you update docs MANUALLY?"*
> — My 14-year-old daughter (who was absolutely right)

**Living docs that ACTUALLY stay synced** - Automatically updated after every task. No manual intervention.

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

## 📊 Engineering Metrics (DORA)

[![Deploy Frequency](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.deploymentFrequency.value&label=Deploy%20Frequency&suffix=/month&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Lead Time](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.leadTime.value&label=Lead%20Time&suffix=h&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![Change Failure Rate](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.changeFailureRate.value&label=Change%20Failure%20Rate&suffix=%25&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)
[![MTTR](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/anton-abyzov/specweave/develop/metrics/dora-latest.json&query=$.metrics.mttr.value&label=MTTR&suffix=min&color=brightgreen)](https://github.com/anton-abyzov/specweave/blob/develop/.specweave/docs/internal/delivery/dora-metrics.md)

**[→ Live Dashboard](https://spec-weave.com/docs/metrics)** | **[→ Detailed Report](https://github.com/anton-abyzov/specweave/blob/develop/metrics/dora-report.md)**

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
