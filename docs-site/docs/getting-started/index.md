---
sidebar_position: 1
title: "Getting Started"
description: "Start shipping features with SpecWeave in 5 minutes"
---

# Getting Started with SpecWeave

**From zero to shipping in 5 minutes.**

SpecWeave is the spec-driven Skill Fabric for AI coding agents. Skills are programs in English — describe what you want, AI asks the right questions, builds it while you sleep.

:::tip Enterprise teams
Building for enterprise? See [compliance, brownfield, and multi-repo guides](/docs/enterprise).
:::

---

## What You Can Build

SpecWeave has been used to ship **production applications in weeks, not months**:

| Application | Type | Result |
|-------------|------|--------|
| **Mobile Apps** | React Native + Expo | iOS & Android builds with offline sync |
| **Web Platforms** | Next.js + Supabase | Full-stack with auth, payments, real-time |
| **APIs** | Node.js + PostgreSQL | OpenAPI specs, Postman collections auto-generated |
| **Infrastructure** | Terraform + K8s | IaC with GitOps, monitoring dashboards |
| **ML Systems** | Python + MLOps | Training pipelines, model deployment |
| **Microservices** | Multi-repo | 20+ services with cross-repo coordination |

### Real-World Examples

> **"5 production apps in ONE MONTH — not 10x faster, 100x faster."**

| App | Description | Tech Stack |
|-----|-------------|------------|
| **SkillUp** | Football coaching platform with Stripe monetization | React Native, Cloudflare Workers |
| **EduFeed** | AI learning platform (NotebookLM-style) | Next.js, Supabase, LLM integration |
| **WC26** | World Cup 2026 companion with AI travel planner | Mobile + Web, real-time data |
| **Lulla** | Baby cry classifier with Apple Watch | Swift, Core ML, Cloudflare R2 |
| **EasyChamp** | Sports league platform with 20+ microservices | GCP, ArgoCD GitOps, ML video analytics |

---

## Quick Start (5 Minutes)

### 1. Install SpecWeave

```bash
npm install -g specweave
```

**Requirements**: Node.js 20.12.0+ (we recommend Node.js 22 LTS)

### 2. Initialize Your Project

```bash
cd your-project
specweave init .
```

Answer the prompts — SpecWeave auto-detects your tech stack and configures accordingly.

### 3. Create Your First Feature

In Claude Code (or your AI tool):

```bash
/sw:increment "Add user authentication with OAuth"
```

SpecWeave creates three permanent files:
- `spec.md` — WHAT (user stories, acceptance criteria)
- `plan.md` — HOW (architecture, ADRs)
- `tasks.md` — DO (implementation tasks with tests)

### 4. Build It

**Option A: Ship While You Sleep**
```bash
/sw:auto
```
Autonomous execution for hours. Real-time progress labels show iteration count, test status, stop criteria.

**Option B: Step-by-Step Control**
```bash
/sw:do          # Execute one task
/sw:progress    # Check status
/sw:done 0001   # Complete with validation
```

### 5. Quality Gates

Before closing, SpecWeave validates:
- All tasks complete
- 60%+ test coverage (configurable)
- Living docs updated

---

## What Makes SpecWeave Different

| Before | After SpecWeave |
|--------|-----------------|
| Specs in chat history | **Permanent, searchable specs** |
| Manual JIRA/GitHub updates | **Auto-sync on every task** |
| Tests? Maybe later... | **Tests embedded in tasks (60%+ enforced)** |
| Architecture in your head | **ADRs captured automatically** |
| "Ask John, he knows" | **Living docs, always current** |
| Onboarding: 2 weeks | **Onboarding: 1 day** |

---

## Platform Support

SpecWeave works everywhere:

| Platform | Support |
|----------|---------|
| **macOS** | Full support (primary development) |
| **Linux** | Full support |
| **Windows** | Full support (WSL recommended for best experience) |

### AI Tool Compatibility

| Tool | Integration Level |
|------|-------------------|
| **Claude Code** | Native (hooks, skills, agents) |
| **Cursor** | Via CLAUDE.md instructions |
| **Windsurf** | Via CLAUDE.md instructions |
| **GitHub Copilot** | Via CLAUDE.md instructions |
| **Any AI IDE** | Via `specweave generate --template=md` |

> **Best Experience**: Claude Code provides the deepest integration with native hooks, skills, and autonomous execution. Other tools work via instruction files.

---

## Choose Your Path

| Your Goal | Next Step |
|-----------|-----------|
| **Quick hands-on** | [Your First Increment](./first-increment) |
| **Understand concepts** | [What is an Increment?](/docs/guides/core-concepts/what-is-an-increment) |
| **Full curriculum** | [SpecWeave Essentials](/docs/academy/specweave-essentials/) |
| **Existing codebase** | [Brownfield Projects](/docs/workflows/brownfield) |
| **External tools** | [GitHub/JIRA/ADO Integration](/docs/academy/specweave-essentials/07-external-tools) |

---

## Troubleshooting

### Node.js Version Error

If you see `SyntaxError: Unexpected token 'with'`:

```bash
node --version  # Must be 20.12.0+
```

[Upgrade instructions](/docs/guides/troubleshooting/common-errors#node-version-error)

### Commands Not Working

After Claude Code updates:

```bash
specweave update      # Full update: CLI + instructions + config + plugins
```

Then restart Claude Code.

---

## Community

- **[Documentation](https://spec-weave.com)** — Full guides and tutorials
- **[Discord](https://discord.gg/UYg4BGJ65V)** — Get help, share tips
- **[YouTube](https://www.youtube.com/@antonabyzov)** — Video tutorials
- **[GitHub](https://github.com/anton-abyzov/specweave)** — Star the repo, contribute

---

**Ready?** → [Create Your First Increment](./first-increment)
