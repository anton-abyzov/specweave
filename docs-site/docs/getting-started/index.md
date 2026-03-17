---
sidebar_position: 1
title: "Getting Started"
description: "Start shipping features with SpecWeave in 5 minutes"
---

# Getting Started with SpecWeave

**From zero to shipping in 5 minutes.**

SpecWeave is the spec-driven Skill Fabric for AI coding agents. Skills extend what AI coding agents can do — describe what you want, AI asks the right questions, builds it while you sleep.

![Increment Lifecycle](/img/diagrams/increment-lifecycle.svg)

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

> **"10 production projects — not 10x faster, 100x faster."**

| App | Description | Tech Stack |
|-----|-------------|------------|
| [**SkillUp**](https://skillup-football.com/) | Football coaching platform with Stripe monetization | React Native, Cloudflare Workers |
| [**WC26**](https://wc-26.net/) | World Cup 2026 companion with AI travel planner | Mobile + Web, real-time data |
| [**Lulla**](https://lulla-app.pages.dev/) | Baby cry classifier with Apple Watch | Swift, Core ML, Cloudflare R2 |
| [**EasyChamp**](https://easychamp.com) | Sports league platform with 20+ microservices | GCP, ArgoCD GitOps, ML video analytics |
| [**BizZone**](https://apps.apple.com/us/app/business-zone/id6756091030) | Student & business events with AI news generation | React Native, AI |
| [**SketchMate**](https://sketchmate.net/) | AI drawing party game | Web, AI vision |
| [**JobWeave**](https://jobweave.ai) | AI-powered job search platform | Web, AI |
| [**VerifiedSkill**](https://verified-skill.com) | Skill registry & marketplace for AI coding agents | Next.js, Cloudflare |
| [**SpecWeave**](https://github.com/anton-abyzov/specweave) | Spec-driven development framework — built with itself | Node.js, TypeScript |
| [**EduFeed**](https://edufeed-jet.vercel.app/) | AI learning platform (NotebookLM-style) | Next.js, Supabase, LLM integration |

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

:::tip Two ways to start
**Slash command:**
```bash
/sw:increment "Add user authentication with OAuth"
```

**Natural language** — just describe what you want:
```
Build a user authentication system with OAuth and social login
```
SpecWeave auto-detects your intent and runs the right skill.
:::

SpecWeave creates three permanent files:
- `spec.md` — WHAT (user stories, acceptance criteria)
- `plan.md` — HOW (architecture, ADRs)
- `tasks.md` — DO (implementation tasks with tests)

### 4. Build It

**Option A: Ship While You Sleep**
```bash
/sw:auto
```
Or just say: `Ship it while I sleep` — SpecWeave starts autonomous execution.

**Option B: Step-by-Step Control**
```bash
/sw:do          # Execute one task
/sw:progress    # Check status
/sw:done 0001   # Complete with validation
```

### 5. Parallelize Complex Features

For features spanning multiple domains, SpecWeave can split work across parallel agents:

```bash
/sw:team-lead "Build user auth with login, signup, and OAuth"
```

Or just describe a complex feature — SpecWeave auto-detects when parallel agents are needed and spawns a coordinated team. Built on [Claude Code's Agent Teams](https://code.claude.com/docs/en/agent-teams), made accessible via a single command. See the [Agent Teams guide](/docs/guides/agent-teams-and-swarms) for details.

### 6. Quality Gates

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

## Explore the Skill Ecosystem

SpecWeave ships with 44 built-in skills across 8 bundled plugins, and you can install from 100,000+ community skills on the [verified-skill.com](https://verified-skill.com) registry:

```bash
# Search for skills
npx vskill find "react"

# Install a verified skill
npx vskill install auth-guard
```

Skills work across 49 AI coding agents — not just Claude Code. See the [Installing Skills](/docs/skills/installation) guide for the full walkthrough.

Want to build your own skills? [Skill Studio](/docs/skills/skill-studio) is a local browser-based IDE for developing, testing, and benchmarking skills.

---

## Choose Your Path

| Your Goal | Next Step |
|-----------|-----------|
| **Quick hands-on** | [Your First Increment](./first-increment) |
| **Understand concepts** | [What is an Increment?](/docs/guides/core-concepts/what-is-an-increment) |
| **Install skills** | [Installing Skills](/docs/skills/installation) |
| **Build skills** | [Skill Studio](/docs/skills/skill-studio) |
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

- **[Documentation](https://verified-skill.com)** — Full guides and tutorials
- **[Discord](https://discord.gg/UYg4BGJ65V)** — Get help, share tips
- **[YouTube](https://www.youtube.com/@antonabyzov)** — Video tutorials
- **[GitHub](https://github.com/anton-abyzov/specweave)** — Star the repo, contribute

---

**Ready?** → [Create Your First Increment](./first-increment)
