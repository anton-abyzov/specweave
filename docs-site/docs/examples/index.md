---
sidebar_position: 8
title: Real-World Examples
description: See SpecWeave in action with real production use cases
keywords: [examples, use cases, real-world, production, mobile, multi-repo, monorepo]
---

import CommandTabs from '@site/src/components/CommandTabs';

# Real-World Examples

See how teams use SpecWeave to ship real products — from beginner projects to production apps with millions of users.

:::tip Every Example Is Verifiable
These are actual open-source projects built with SpecWeave. Every repo structure, tech stack, and increment count is real. No fabricated metrics.
:::

---

## 🟢 Beginner: URL Shortener

### Multi-Repo Shared Library Pattern

**Repos**: 3 (frontend, backend, common) · **Tech**: React + Vite, Express, TypeScript, Vitest

A URL shortener demonstrating the **shared library pattern** — a common TypeScript library consumed by both frontend and backend.

```
sw-url-shortener/
├── common/           # @url-shortener/common — shared types, validators, generators
├── backend/          # Express API — URL creation, redirect, click stats
└── frontend/         # React + Vite — URL submission, stats dashboard
```

#### Getting Started

<CommandTabs
  natural="Let's build a URL shortener with shared types across frontend and backend"
  claude='sw:increment "Build URL shortener with shared library pattern"'
  other='increment "Build URL shortener with shared library pattern"'
/>

#### What SpecWeave Generated

- **spec.md**: 2 user stories — URL shortening (6-char alphanumeric codes) and click statistics
- **plan.md**: Shared library first, then backend API, then frontend UI (dependency order)
- **tasks.md**: Separated by package — common (types + validators), backend (Express routes + tests), frontend (React components + tests)

#### Key Features Demonstrated

- ✅ **Shared library pattern** — TypeScript interfaces reused across packages via `file:` links
- ✅ **Multi-package coordination** — SpecWeave respects dependency order (common → backend → frontend)
- ✅ **Test isolation** — Each package has its own Vitest config and test suite

**Source**: [github.com/anton-abyzov/sw-url-shortener](https://github.com/anton-abyzov/sw-url-shortener)

---

## 🟡 Intermediate: Meeting Cost Calculator

### Multi-Project Configuration with Prefixes

**Projects**: 4 (root, backend, frontend, shared) · **Tech**: TypeScript monorepo

A meeting cost calculator showing **multi-project SpecWeave configuration** — each sub-project gets its own prefix for routing increments and syncing to external tools.

```
sw-meeting-cost/
├── sw-meeting-cost/         # Root project (prefix: SW)
├── sw-meeting-cost-be/      # Backend API (prefix: BE)
├── sw-meeting-cost-fe/      # Frontend app (prefix: FE)
└── sw-meeting-cost-shared/  # Shared utilities (prefix: SHARED)
```

#### Getting Started

<CommandTabs
  natural="I want to build a meeting cost calculator with separate frontend and backend"
  claude='sw:increment "Build meeting cost calculator with multi-project setup"'
  other='increment "Build meeting cost calculator with multi-project setup"'
/>

#### Multi-Project Config

SpecWeave routes user stories to the correct project based on the `**Project**:` field:

```yaml
# .specweave/config.json (simplified)
{
  "projects": [
    { "name": "sw-meeting-cost",    "prefix": "SW" },
    { "name": "sw-meeting-cost-be", "prefix": "BE" },
    { "name": "sw-meeting-cost-fe", "prefix": "FE" },
    { "name": "sw-meeting-cost-shared", "prefix": "SHARED" }
  ]
}
```

Each user story in spec.md targets a specific project:
```markdown
### US-001: Calculate meeting cost
**Project**: sw-meeting-cost-be    # ← Routes to backend project
```

#### Key Features Demonstrated

- ✅ **Multi-project prefixes** — Each sub-project has its own ID prefix for tracking
- ✅ **Cross-project user stories** — One increment spans multiple projects
- ✅ **Sync routing** — GitHub Issues / JIRA tickets created per-project based on `**Project**:` field

**Source**: [github.com/anton-abyzov/sw-meeting-cost](https://github.com/anton-abyzov/sw-meeting-cost)

---

## 🔴 Advanced: FIFA World Cup 2026 Travel Companion

### Production Multi-Repo App with Mobile

**Repos**: 5 · **Increments**: 36 completed · **Live**: [wc-26.net](https://wc-26.net) · **Mobile**: App Store

The most comprehensive SpecWeave example — a full production platform with web app, API, scraper, mobile app, and database, all coordinated through SpecWeave increments.

```
sw-wc26-travel/
├── wc26-web/        # React 19 + React Router — Cloudflare Pages
├── wc26-api/        # Hono.js REST API — Cloudflare Workers
├── wc26-scraper/    # AI-powered scraper — Cloudflare Workers + Workers AI (Llama 3.1)
├── wc26-mobile/     # Expo / React Native — App Store (v1.0.3)
└── wc26-supabase/   # Supabase schema + migrations
```

#### Getting Started

<CommandTabs
  natural="Let's build a World Cup travel companion with match schedules, tickets, and trip planning"
  claude='sw:increment "Build WC2026 travel companion — matches, tickets, venues, trip planner"'
  other='increment "Build WC2026 travel companion — matches, tickets, venues, trip planner"'
/>

#### How 36 Increments Built a Production App

| Increment | What It Built | Repos Touched |
|-----------|--------------|---------------|
| 0001 - MVP | Match schedules, venue maps, basic UI | web, api, scraper |
| 0002 | Enhanced travel & ticket experience | web, api |
| 0003 | Team squads & player data | api, scraper |
| 0005 | Profile image uploads | web, api, supabase |
| 0008 | **React Native mobile app** | mobile (new repo) |
| 0009 | Smart AI travel planning | web, api |
| 0010 | Google Maps integration | web |
| ... | 29 more increments | various |

**MVP increment (0001)** alone had **58 tasks** across 3 repos, organized in 9 phases:
1. Foundation → 2. Data Layer → 3. Scraper → 4. API Routes → 5. Web UI → 6. Interactive Maps → 7. Trip Planner → 8. Auth → 9. Polish & Testing

#### Tech Stack

| Layer | Technology | Deployment |
|-------|-----------|------------|
| **Web** | React 19, TailwindCSS, TanStack Query, Leaflet | Cloudflare Pages |
| **API** | Hono.js, TypeScript, JWT auth | Cloudflare Workers |
| **Scraper** | Workers AI (Llama 3.1), cron triggers | Cloudflare Workers |
| **Mobile** | Expo SDK 54+, React Native New Architecture, NativeWind | App Store |
| **Database** | Supabase (PostgreSQL), Cloudflare R2 | Managed |

#### Key Features Demonstrated

- ✅ **Multi-repo coordination** — 5 repos with cross-project dependencies
- ✅ **Incremental delivery** — 36 increments from MVP to production
- ✅ **Mobile app** — Full React Native/Expo app published to App Store
- ✅ **AI integration** — Workers AI (Llama 3.1) for content parsing and travel planning
- ✅ **Production deployment** — Live at wc-26.net with real users

**Source**: [github.com/anton-abyzov/sw-wc26-travel](https://github.com/anton-abyzov/sw-wc26-travel)

---

## 🏗️ Framework Showcase: SpecWeave Building Itself

### 610+ Increments of Dogfooding

**Repos**: 3 (specweave CLI, vskill, vskill-platform) · **Increments**: 610+ · **Live**: [spec-weave.com](https://spec-weave.com)

SpecWeave is itself built with SpecWeave — every feature, bugfix, docs page, and release is an increment.

#### The Numbers

| Metric | Value |
|--------|-------|
| Total increments | 610+ |
| Child repositories | 3 (specweave, vskill, vskill-platform) |
| Umbrella coordination | All increments managed from umbrella root |
| External sync | GitHub Issues, JIRA, Azure DevOps |

#### Example: This Very Documentation

<CommandTabs
  natural="The examples page needs updating with real projects"
  claude='sw:increment "Docs examples rewrite with real projects"'
  other='increment "Docs examples rewrite with real projects"'
/>

This page you're reading right now was created as increment **0611** — with spec.md defining the user stories, plan.md documenting the approach, and tasks.md tracking the work.

#### Key Features Demonstrated

- ✅ **Umbrella repo pattern** — All increments in umbrella root, routed by `**Project**:` field
- ✅ **Continuous spec-driven development** — 610+ increments over months of active development
- ✅ **Self-referential** — The tool documents its own features using its own workflow

---

## Comparison Matrix

| Project | Repos | Increments | Tech Stack | Best For |
|---------|-------|------------|------------|----------|
| **URL Shortener** | 3 | 1+ | React, Express, TS | Learning shared library pattern |
| **Meeting Cost** | 4 | 1+ | TS monorepo | Multi-project configuration |
| **WC26 Travel** | 5 | 36 | Hono, React, Expo | Production multi-repo + mobile |
| **SpecWeave** | 3+ | 610+ | TS, Node.js | Umbrella repo at scale |

---

## Try It Yourself

### Starter Projects

**Easy** (30 minutes):

<CommandTabs
  natural="Let's add a dark mode toggle to the website"
  claude='sw:increment "Add dark mode toggle to website"'
  other='increment "Add dark mode toggle to website"'
/>

**Medium** (1-2 hours):

<CommandTabs
  natural="I want to build a REST API with CRUD operations and full test coverage"
  claude='sw:increment "Build REST API with CRUD operations and tests"'
  other='increment "Build REST API with CRUD operations and tests"'
/>

**Advanced** (2-4 hours):

<CommandTabs
  natural="Let's create a React Native todo app with offline sync and cloud backup"
  claude='sw:increment "Create React Native todo app with offline sync"'
  other='increment "Create React Native todo app with offline sync"'
/>

### Learning Path

1. **Start small** — Single-repo, 5-10 tasks
2. **Add complexity** — Multi-file changes, more tests
3. **Go autonomous** — Let `sw:auto` run for hours
4. **Scale up** — Multi-repo, complex integrations

---

## What Can You Build?

SpecWeave handles any software project:

- ✅ Single-page apps (React, Vue, Angular)
- ✅ Full-stack monoliths (Next.js, Rails, Django)
- ✅ Microservices (multi-repo, event-driven)
- ✅ Mobile apps (React Native, Expo, Flutter)
- ✅ CLI tools (Node, Python, Go, Rust)
- ✅ Libraries & SDKs (published to npm/PyPI)
- ✅ Documentation sites (Docusaurus, VitePress)
- ✅ Infrastructure (Terraform, Kubernetes)
- ✅ Non-code automation (research, knowledge management, publishing)

**Not building software?** See our [Life Automation guide](/docs/guides/life-automation) for non-code use cases.

---

## More Examples

Browse all SpecWeave example repositories:

| Category | Repos | Highlights |
|----------|-------|-----------|
| **GitHub Sync** | sw-gh-habit-tracker, sw-gh-polls, sw-gh-inventory, sw-gh-ai-prompt | GitHub Issues ↔ SpecWeave sync |
| **JIRA Sync** | sw-jira-feedback-board, sw-jira-fitness-tracker, sw-jira-todo-sync | JIRA ↔ SpecWeave bidirectional sync |
| **ADO Sync** | sw-ado-expense-tracker | Azure DevOps ↔ SpecWeave sync |
| **Multi-Repo** | sw-url-shortener, sw-markdown-editor, sw-voice-memo | Shared library patterns |
| **Games** | sw-mini-doom | 3D WebGL shooter with Three.js |
| **Supabase** | sw-finance-snapshot | Supabase backend integration |

All repos: [github.com/anton-abyzov](https://github.com/anton-abyzov?tab=repositories&q=sw-)

---

## Next Steps

- **Try an example**: Pick one from above and run it
- **Read the guides**: [Multi-project setup](/docs/guides/multi-project-setup) · [Autonomous execution](/docs/guides/autonomous-execution)
- **Watch videos**: [YouTube tutorials](https://www.youtube.com/@antonabyzov)
- **Join community**: [Discord](https://discord.gg/UYg4BGJ65V)
