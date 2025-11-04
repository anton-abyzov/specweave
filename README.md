# SpecWeave

> **Spec-Driven Development Framework - Designed for Claude Code, works with other AI tools**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/test.yml?branch=develop&label=Tests)](https://github.com/anton-abyzov/specweave/actions/workflows/test.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/anton-abyzov/specweave/e2e-smoke-test.yml?branch=develop&label=E2E)](https://github.com/anton-abyzov/specweave/actions/workflows/e2e-smoke-test.yml)
[![Discord](https://img.shields.io/badge/Discord-Join_Server-5865F2?logo=discord&logoColor=white)](https://discord.gg/UYg4BGJ65V)
[![YouTube](https://img.shields.io/badge/YouTube-Subscribe-red?logo=youtube&logoColor=white)](https://www.youtube.com/@antonabyzov)

**Define WHAT and WHY before HOW. Specifications evolve with code, never diverge.**

---

## 📖 Full Documentation

**For complete guides, tutorials, and API reference, visit:**

### **[spec-weave.com](https://spec-weave.com)**

---

## What is SpecWeave?

SpecWeave is a **disciplined development framework** that acts as your AI tutor, guiding you through structured, incremental software delivery. **Designed for Claude Code** (giving best results), it also works with other AI tools like Cursor, Copilot, and ChatGPT. It replaces "vibe coding" with a disciplined approach: complete one thing fully before starting the next.

**The Core Philosophy**: You can't build a stats chart feature when you haven't built the UI components yet. SpecWeave enforces natural dependencies, ensuring you build in the right order and complete each increment before moving forward.

---

## Quick Start

```bash
# Install SpecWeave CLI
npm install -g specweave

# Initialize your project
specweave init my-project
cd my-project

# Start building
/inc "User authentication"  # Plan increment
/do                          # Implement tasks
/done 0001                   # Complete increment
```

**New to SpecWeave?** → **[Getting Started Guide](https://spec-weave.com/docs/guides/getting-started/quickstart)**

---

## Key Features

### 🧪 Test-Aware Planning
Embedded test plans in every task with BDD format (Given/When/Then) for clarity

### 🎯 Disciplined Progress
Cannot start increment N+1 until N is DONE - enforces completion before moving forward

### ⏸️ Smart Status Management
Pause when blocked, resume when ready, abandon obsolete work - all with full context

### 📚 Living Documentation
Auto-updates after every task via Claude Code hooks - never outdated

### 🤖 Intelligent Agents
PM Agent, Architect, test-aware-planner, Quality Judge - specialized AI agents guide you

**[→ Explore All Features](https://spec-weave.com/docs/overview/features)**

---

## 📊 Engineering Metrics

SpecWeave tracks **DORA metrics** (Deployment Frequency, Lead Time, Change Failure Rate, MTTR) to measure engineering performance.

**[→ View Live Dashboard](https://spec-weave.com/docs/metrics)**

---

## For Brownfield Projects

Initialize SpecWeave in existing codebases to create retroactive specifications, architecture diagrams, and living documentation.

**[→ Brownfield Guide](https://spec-weave.com/docs/workflows/brownfield)**

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
- 📊 [DORA Metrics Dashboard](https://spec-weave.com/docs/metrics)
- 🏢 [Brownfield Integration](https://spec-weave.com/docs/workflows/brownfield)
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

**SpecWeave** - Replace vibe coding with spec-driven development.

**Get started**: `npm install -g specweave` → `specweave init my-project` → **[Read the Docs](https://spec-weave.com)**
