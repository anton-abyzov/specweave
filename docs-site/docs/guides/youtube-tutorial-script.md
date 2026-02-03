---
sidebar_position: 99
title: YouTube Tutorial Script
description: Video script for SpecWeave introduction tutorial - comprehensive walkthrough of spec-weave.com
draft: true
---

# SpecWeave Complete Tutorial - YouTube Video Script

**Duration**: ~60 minutes
**Format**: Screen recording walking through spec-weave.com documentation + terminal demos
**Diagrams**: Mermaid (already embedded in docs) + 5 Excalidraw transitions
**Teaching Claude**: This script teaches Claude how SpecWeave works by walking through real docs

---

## INTRO - THE VIBE CODING PROBLEM (0:00 - 2:30)

**[SCREEN: Navigate to docs/guides/lessons/11-vibe-coding-problem]**

> "Before I show you SpecWeave, let me explain the problem it solves.
>
> This is what I call 'Vibe Coding' — and almost everyone does it."

**[READ from the page - The 5 Pain Points]**

> "Pain Point 1: **Context Evaporation**. Monday you have a great conversation with Claude about payment architecture. Friday, nobody remembers why you chose idempotency keys.
>
> Pain Point 2: **Scattered Implementation**. Each AI request produces isolated code. No shared services. No consistent patterns.
>
> Pain Point 3: **No Quality Gates**. Generated code goes straight to production. No tests. No review. No validation.
>
> Pain Point 4: **Documentation Debt**. You promise to document later. You never do.
>
> Pain Point 5: **Onboarding Nightmare**. New developers have zero context. Everything is tribal knowledge."

**[PERSONAL STORY - WHY I BUILT THIS]**

> "Now, I didn't just read about these problems — I lived them. For months, I used BMAD and speckit for my AI-assisted development. Great tools. Seriously.
>
> But I kept hitting walls. Context would disappear between sessions. Specifications lived in chat history. There was no traceability from requirements to code. Every new project meant rebuilding the same scaffolding.
>
> I'd finish a feature on Monday and by Thursday couldn't remember why I made certain decisions. Sound familiar?
>
> So I asked myself: what would a framework look like that solves these problems for good? Not just for this project, but for the next ten projects. Something I could rely on for months and years, not just days.
>
> That question became SpecWeave."

**[QUICK PREVIEW - WHAT'S POSSIBLE]**

> "But before diving into how SpecWeave works, let me show you what's possible when you solve these problems.
>
> In the past month alone, using SpecWeave, I've shipped five production applications:"

**[SCREEN: Quick montage - 5-10 seconds per app, showing the most impressive screen]**

> "**SkillUp** — A football coaching platform where coaches monetize their training programs through Stripe. Instagram-like feed on mobile and web, lesson scheduling, challenges, program configurations. Even has scrapers pulling great content from YouTube channels.
>
> **EduFeed** — Educational content platform with NotebookLM-style AI. Create study materials from YouTube videos, PDFs, URLs — generates videos, audio, quizzes, flashcards, mind maps. Includes video rooms like Zoom where students collaborate and share materials.
>
> **WC26** — Your ultimate World Cup 2026 companion. AI travel planner integrates flights and ticket purchasing. Complete team stats, fixtures, player analytics, venue information. Mobile and web with Supabase auth.
>
> **Lulla** — Calm your baby anywhere. Swift iOS app with Apple Watch integration. Uses machine learning to classify baby cries — tired, hungry, or pain — and plays scientifically-backed sounds to soothe them. Smart playlist generation like Spotify, with offline support via Cloudflare R2.
>
> **EasyChamp** — Four years running, this is an AI-powered sports league management platform. Over 20 microservices deployed on GCP with ArgoCD GitOps. Includes ML video analytics using computer vision models, complete tournament systems from group stages to double elimination, custom websites for leagues, and Stripe monetization for tournament organizers."

**[SCREEN: Back to you]**

> "Most of these apps are Cloudflare Workers with Remix or Next.js. Almost all have LLM chat capabilities — some open-source, some paid models. And here's the key — my daughters helped build some of these. My 10-year-old worked on SkillUp. My 14-year-old contributed to EduFeed.
>
> **Here's the insane part**: All of this — five production apps — built in ONE MONTH. Not 10x faster than before. **100x faster**.
>
> You know what else was a side project? Claude Code itself. The tool I'm using to build all of this? Created by Anthropic as almost an experiment. And now it's enabling this level of productivity.
>
> The moral? We're living in a different era now. What used to take a year can happen in a month. What seemed impossible is now Tuesday afternoon. SpecWeave + Claude Code is that unlock.
>
> If you want to see these apps in detail, I'll walk through them at the end of this video. But for now, understand this: all of these were built with SpecWeave. Every feature spec'd. Every decision documented. Every change traceable.
>
> Without SpecWeave, I'd still be on app number two, trying to remember why I chose one authentication pattern over another."

**[BRIEF NOTE - OUT OF SCOPE]**

> "Now, you might be wondering about the marketing side of these apps — how do I create ad creatives, test them, optimize conversion rates? That's a whole separate video.
>
> We're talking about generating production-ready video ads using the latest AI tools — not just 5-second clips, but full ad sequences that reference previous frames for continuity. Then running A/B tests through Meta Ads, analyzing the usage stats, and automatically choosing the best performing creative out of 5 AI-generated variants.
>
> It's a complete chain from generation to deployment to optimization. But that's not what this video is about. Leave a comment if you want to see that workflow — I'll make a dedicated video on AI-powered marketing automation.
>
> For now, let's focus on what matters for developers: building the actual products. Not marketing them — building them."

**[EXCALIDRAW TRANSITION: "Vibe Coding" crossed out → "Spec-Driven Development"]**

> "SpecWeave solves ALL of these. Let me show you how."

---

## SECTION 1: WHAT IS SPECWEAVE (2:30 - 4:30)

**[SCREEN: Navigate to spec-weave.com homepage]**

> "SpecWeave is the spec-driven AI framework. That's the key word — spec-driven. Not vibe-driven. Not chat-driven. Spec-driven."

**[EXCALIDRAW: 3 Commands to Ship]**

```
┌─────────────────────────────────────────────────────────────┐
│                 3 COMMANDS TO SHIP                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   1. /sw:increment "Add OAuth"                              │
│      → Creates spec.md + plan.md + tasks.md                 │
│                                                              │
│   2. /sw:auto                                               │
│      → Autonomous execution for HOURS                       │
│                                                              │
│   3. /sw:done 0001                                          │
│      → Quality gates: tasks ✓ tests 60%+ ✓ docs ✓          │
│                                                              │
│   Every feature = permanent documentation.                   │
│   Searchable. Traceable. Always in sync.                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

> "Three commands. That's all it takes. Define what you want, let AI build it, validate and ship. Every feature becomes permanent documentation — searchable, traceable, always in sync."

**[SCREEN: Navigate to docs/intro.md - scroll to workflow diagram]**

```
Your Idea → Spec ✓ → Plan ✓ → Tasks ✓ → Code → Living Docs
```

> "See these checkmarks? Every step creates a permanent file. Not chat history. Permanent, version-controlled documentation."

**[SCROLL to "What You Get" comparison table]**

> "Before SpecWeave: specs in chat, manual JIRA updates, tests maybe later, architecture in your head, onboarding takes forever.
>
> After SpecWeave: permanent searchable specs, auto-sync on every task, tests embedded in tasks with 60% coverage enforced, ADRs captured automatically, onboarding becomes trivial."

**[Point to key positioning]**

> "And here's the positioning that matters: Legacy. Startup. Enterprise.
>
> Drop it into a **10-year-old codebase** — it understands everything.
> Use it on your **weekend MVP** — specs write themselves.
> Scale it to **50 teams** — JIRA, GitHub, Azure DevOps sync automatically.
>
> **100% free and open source.** Not freemium. Not 'free tier with limits.' Fully open source, MIT license, forever."

**[SCROLL to DORA badges]**

> "And these aren't marketing numbers. SpecWeave builds SpecWeave. 100+ deploys per month. Zero failures across 65+ releases. We'll come back to this."

---

## SECTION 1.25: WHY SPECWEAVE ISN'T A "FRAMEWORK" (4:00 - 4:30)

**[SCREEN: Show the word "Framework" with negative associations crossed out]**

> "Now, when you hear 'framework,' you might think Angular — heavy, opinionated, lots of rules. That's NOT what SpecWeave is.
>
> SpecWeave is more like... steroids for your AI. A lightweight layer that gives Claude Code — or any AI tool — enterprise capabilities:
>
> - **Permanent memory** instead of chat that disappears
> - **GitHub/JIRA sync** instead of manual ticket updates
> - **Quality gates** instead of 'we'll add tests later'
> - **Autonomous execution** instead of babysitting every prompt"

**[EXCALIDRAW: "Framework" crossed out → "AI Supercharger"]**

```
┌─────────────────────────────────────────────────────────────┐
│         SPECWEAVE IS NOT A CONSTRAINING FRAMEWORK            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ❌ NOT Angular vibes — heavy, opinionated, many rules      │
│  ❌ NOT a walled garden — delete it tomorrow, specs remain   │
│  ❌ NOT proprietary — just markdown files (spec.md, etc.)   │
│                                                              │
│  ✅ IS a lightweight layer — 3 markdown files per feature   │
│  ✅ IS an amplifier — makes your AI 10x more capable        │
│  ✅ IS team-agnostic — Claude, GPT-4, Copilot, any AI works │
│                                                              │
│  THE POSITIONING:                                            │
│  "The Enterprise Layer for AI Coding"                        │
│  — enterprise capabilities without enterprise complexity     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

> "It's three markdown files — spec.md, plan.md, tasks.md. That's it. You can delete SpecWeave tomorrow and your specs still exist. No lock-in. No database. No server.
>
> The truth? Claude Code by itself is already incredible. But it lacks enterprise features — external tool sync, multi-project coordination, quality enforcement, long-term memory.
>
> SpecWeave adds those missing pieces. It's the difference between:
> - A powerful tool you use session by session
> - An AI development system that compounds over time"

**[Quick mention of Claude Code velocity]**

> "And here's something cool — Anthropic ships Claude Code features faster than they can document them. New version every week. SpecWeave tracks those changes and uses the latest optimizations automatically.
>
> `context: fork` for isolated execution. `model: opus` for critical decisions. MCP Tool Search for 85% token reduction. Skill-scoped hooks for efficiency.
>
> You don't have to read Claude Code changelogs. SpecWeave does it for you."

**[SECTION 1.35: DETERMINISTIC VS NON-DETERMINISTIC]**

> "Now, before we go further, I want to set your expectations correctly. There's a fundamental difference between traditional programming and working with LLMs.
>
> When you call a function in traditional code — like `calculateTotal(items)` — you get the **exact same result** every time. That's **deterministic**. Input A always produces output B. Predictable. Reliable. Testable.
>
> But when you work with Claude or any LLM, it's **non-deterministic**. You might be 90% confident in what response you'll get, but it's never 100%. The same prompt can produce slightly different outputs. Temperature, context length, even the order of messages can affect results.
>
> This isn't a weakness — it's the nature of how LLMs work. They generate creative, contextual responses. But it means your workflow needs guardrails.
>
> That's exactly what SpecWeave provides — structure around non-deterministic AI. Specs define what success looks like. Tasks break work into verifiable chunks. Hooks validate outputs. Quality gates catch drift.
>
> Think of it this way:
> - **Deterministic**: `function add(a, b) { return a + b; }` — always the same
> - **Non-deterministic**: 'Claude, implement authentication' — probably right, needs verification
>
> Throughout this tutorial, remember: we're not writing scripts that execute the same way every time. We're orchestrating an AI that needs guidance, validation, and clear acceptance criteria to stay on track."

---

## SECTION 1.5: THE CLAUDE CODE FOUNDATION (4:30 - 8:00)

**[SCREEN: Navigate to a code editor showing .claude/ folder structure]**

> "Before we dive into SpecWeave's philosophy, you need to understand the foundation it's built on — Claude Code itself. This is critical because SpecWeave leverages Claude Code's architecture in powerful ways."

**[Point to the plugin architecture]**

> "Claude Code has a plugin-based architecture with five core components. Let me show you how they relate — this is based on the official Claude Agent SDK documentation."

**[EXCALIDRAW: Claude Code Architecture Overview]**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLAUDE CODE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                         📦 PLUGINS                                   │
│                    (Extension Packages)                              │
│                           │                                          │
│          ┌────────────────┼────────────────┐                         │
│          │                │                │                         │
│          ▼                ▼                ▼                         │
│    ⚡ SKILLS        🤖 AGENTS       📝 COMMANDS                      │
│   Auto-activate     Spawn for         User invokes                   │
│   on keywords       isolated tasks    with /slash                    │
│          │                │                │                         │
│          └────────────────┼────────────────┘                         │
│                           │                                          │
│                     🪝 HOOKS                                         │
│                Fire on events                                        │
│          (task done, session end)                                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> "Here's the key insight: **Plugins are containers**. They bundle related functionality together. Skills, agents, commands, and hooks all live inside plugins."

**[EXCALIDRAW: Component Relationship Flow]**

```
┌─────────────────────────────────────────────────────────────────────┐
│                   HOW COMPONENTS RELATE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   User: "Review code for security"                                   │
│              │                                                       │
│              ▼                                                       │
│   ┌────────────────────────┐                                        │
│   │  SKILL auto-activates  │ ← Keywords trigger activation          │
│   │  (security expertise)  │                                        │
│   └────────────────────────┘                                        │
│              │                                                       │
│     Complex task needed?                                             │
│              │                                                       │
│              ▼                                                       │
│   ┌────────────────────────┐                                        │
│   │  AGENT spawns          │ ← Task tool creates subprocess         │
│   │  (isolated context)    │                                        │
│   └────────────────────────┘                                        │
│              │                                                       │
│              ▼                                                       │
│   ┌────────────────────────┐                                        │
│   │  HOOK fires            │ ← Events trigger automation            │
│   │  (PostToolUse)         │                                        │
│   └────────────────────────┘                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> "See the flow? **Skills** provide expertise inline in your conversation. When you need isolated execution, skills can spawn **Agents**. **Hooks** fire automatically on events. **Commands** are your explicit controls."

**[EXCALIDRAW: What You Get After specweave init]**

```
┌─────────────────────────────────────────────────────────────────────┐
│         WHAT YOU GET AFTER: specweave init .                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ⚡ 136 SKILLS      🤖 68 AGENTS       📝 53 COMMANDS               │
│  Auto-activating    PM, Architect,     Slash commands               │
│  on keywords        DevOps, QA,        for workflow                 │
│  (in conversation)  Security, SRE      control                      │
│                     (isolated tasks)                                 │
│                                                                      │
│  📦 24 PLUGINS      🪝 65+ HOOKS       📄 CLAUDE.md                 │
│  Domain-specific    Event-driven       Your project                 │
│  packages           automation         reference                    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1. Plugins - Extending Claude Code

**[TERMINAL: Show plugin structure]**

```bash
ls .claude/plugins/
# sw/              - Core SpecWeave plugin
# sw-github/       - GitHub integration
# sw-jira/         - JIRA integration
# sw-ado/          - Azure DevOps
# sw-frontend/     - Frontend expertise
# sw-backend/      - Backend expertise
# sw-ml/           - Machine learning
# sw-kafka/        - Kafka expertise
# ...24 total plugins
```

> "Plugins are packages of related functionality. Each plugin can contain skills, agents, hooks, and commands. SpecWeave ships with 24 plugins — each focused on a domain."

### 2. Skills - Auto-Activating Expertise

**[SCREEN: Show skill activation example]**

> "Skills are the magic. They're SKILL.md files that Claude automatically loads when your keywords match the skill's description."

```
User: "Review this code for security issues"
→ sw:security skill activates (OWASP, auth, vulnerabilities)

User: "Design the authentication system"
→ sw:architect skill activates (ADRs, patterns, decisions)

User: "Write API documentation"
→ sw:docs-writer skill activates (OpenAPI, markdown, examples)
```

> "136 skills across all SpecWeave plugins. You don't call skills — Claude matches your request against skill descriptions and activates the relevant ones.
>
> Key insight: Skills run **in your conversation**. They provide expertise inline. Since Claude Code v2.1.0, skills hot-reload — update a skill file, it's available immediately without restarting."

**[EXCALIDRAW: Skill Anatomy]**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SKILL ANATOMY (SKILL.md)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ---                                                                │
│   description: Security expert for code review                       │
│   triggers: security, OWASP, vulnerability, auth                     │
│   allowed-tools: Read, Grep, Glob                                    │
│   ---                                                                │
│                                                                      │
│   # Security Review Skill                                            │
│                                                                      │
│   When reviewing code for security issues:                           │
│   1. Check for OWASP Top 10 vulnerabilities                         │
│   2. Review authentication and authorization                         │
│   ...                                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Agents - Specialized Task Execution

**[Point to the difference]**

> "Skills guide. Agents execute. This is the critical distinction.
>
> **Skills** — Run in your conversation, provide expertise inline, no isolation
>
> **Agents** — Spawn as separate processes, work in isolated context, return results"

**[EXCALIDRAW: Skills vs Agents]**

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SKILLS vs AGENTS                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  SKILL                              AGENT                           │
│  ──────                             ─────                           │
│  • Auto-activates                   • Explicitly spawned            │
│  • Main conversation                • Isolated context              │
│  • Provides guidance                • Executes tasks                │
│  • Lightweight                      • Can run in parallel           │
│                                                                      │
│  Example:                           Example:                        │
│  "How do I optimize SQL?"           "Analyze all 50 files           │
│  → SQL skill guides you              and write a report"            │
│                                     → Agent works isolated          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**[TERMINAL: Show skill invocation example]**

```bash
# Invoke Kubernetes skill for complex manifest generation
Skill({
  skill: "sw-k8s:kubernetes-architect",
  args: "Generate K8s manifests for 3-tier app with Istio service mesh"
})
```

> "68 specialized agents in SpecWeave:
> - `sw-frontend:frontend-architect` → React, Vue, Next.js expertise
> - `sw-k8s:kubernetes-architect` → K8s, Helm, ArgoCD, GitOps
> - `sw-ml:ml-engineer` → Model training, MLOps, data pipelines
> - `sw-mobile:mobile-architect` → React Native, Expo, native iOS/Android
> - `sw-testing:qa-engineer` → Playwright, Vitest, comprehensive testing
>
> **Why agents?** Context isolation — complex tasks don't pollute your main conversation. Tool restrictions — read-only agents can't modify files. Parallelization — multiple agents can run concurrently."

### 4. Marketplace - One-Command Installation

**[TERMINAL: Show marketplace refresh]**

```bash
# Full update: CLI + instructions + config + plugins (recommended)
specweave update

# For SpecWeave contributors (in the repo)
bash scripts/refresh-marketplace.sh
```

> "The marketplace lets you install all plugins with one command. Since v1.0.138, `specweave update` does everything — updates CLI, regenerates CLAUDE.md, migrates config, AND refreshes marketplace plugins. No separate commands needed.
>
> Install SpecWeave, run `specweave update`, restart Claude Code. Done. 136 skills and 68 agents available instantly."

### 5. Hooks - Event-Driven Automation

**[SCREEN: Show hooks directory]**

```bash
ls .claude/hooks/
# session-start.sh     - Runs when session starts
# task-completed.sh    - Updates living docs after task
# increment-created.sh - Validates increment structure
# stop.sh              - Triggers before session ends
```

> "Hooks are shell scripts that run automatically when events happen:
>
> - Task completed? Hook updates living docs, syncs acceptance criteria
> - Increment created? Hook validates structure, checks dependencies
> - Session ending? Hook can trigger reflection, extract learnings
>
> 65 hooks in SpecWeave. You never call them. They fire when their event happens."

### 6. CLI vs MCP - The Fading Role of MCP

**[SCREEN: Split view - CLI command vs MCP server]**

> "Here's something controversial: MCP — Model Context Protocol — is getting less relevant.
>
> MCP servers were supposed to be the way Claude connects to external services. Supabase MCP server. GitHub MCP server. Notion MCP server.
>
> But here's what I've found — **direct CLI usage is often better**."

**[EXCALIDRAW: CLI vs MCP comparison]**

```
┌─────────────────────────────────────────────────────────┐
│                   CLI vs MCP                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CLI (Direct)              MCP (Server Layer)            │
│  ─────────────            ──────────────────            │
│  ✅ No middleware          ❌ Extra abstraction          │
│  ✅ Full feature set       ❌ Limited APIs exposed       │
│  ✅ Latest always          ❌ Server must update         │
│  ✅ Error messages clear   ❌ Errors wrapped/hidden      │
│  ✅ Auth once (gh login)   ❌ Separate MCP auth          │
│                                                          │
│  Examples:                                               │
│  • gh issue create         vs  GitHub MCP                │
│  • wrangler deploy         vs  Cloudflare MCP            │
│  • supabase db push        vs  Supabase MCP              │
│  • vercel deploy           vs  Vercel MCP                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> "Real example — Supabase:
>
> **With MCP**: Install server, configure connection, restart Claude Code, hope the MCP server exposes the API you need
>
> **With CLI**: `supabase login` once, then `supabase db push`, `supabase functions deploy`, `supabase storage upload` — everything just works
>
> Same with GitHub — `gh auth login` once, then `gh issue create`, `gh pr create`, `gh release create`. No MCP server needed.
>
> Cloudflare — `wrangler login` once, then `wrangler deploy`, `wrangler kv:key put`, `wrangler d1 execute`. Direct. Fast. Reliable.
>
> MCP adds a layer. Sometimes useful — like for proprietary systems with no CLI. But for modern developer tools? CLI wins."

**[Point to SpecWeave's approach]**

> "SpecWeave embraces this reality. Our skills and hooks use CLIs directly:
>
> - GitHub sync? Uses `gh` CLI, not MCP
> - Cloudflare deploy? Uses `wrangler` CLI
> - Supabase migrations? Uses `supabase` CLI
>
> Fewer dependencies, fewer failure points, faster execution."

### 6.5. The Two MCP Servers You SHOULD Install

**[EXCALIDRAW: Essential MCP Servers]**

```
┌─────────────────────────────────────────────────────────────────────┐
│           THE TWO MCP SERVERS EVERY PROJECT NEEDS                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  📚 CONTEXT7 (Real-Time Documentation)                              │
│     • Fetches latest docs for ANY library                           │
│     • React 19? Next.js 15? Supabase v2? Always current             │
│     • No more hallucinated APIs                                      │
│                                                                      │
│     Install: claude mcp add context7 -- npx -y @anthropic-ai/context7-mcp
│                                                                      │
│  🎭 PLAYWRIGHT (Browser Automation)                                 │
│     • Automates E2E testing at the browser level                    │
│     • Screenshot verification, form testing, visual regression      │
│     • Claude can literally SEE your app                              │
│                                                                      │
│     Install: claude mcp add playwright -- npx -y @anthropic-ai/playwright-mcp
│                                                                      │
│  WHY THESE TWO?                                                     │
│  • Context7 → Claude knows correct APIs (no guessing)               │
│  • Playwright → Claude can verify UI actually works                  │
│  • Together → From spec to tested, verified feature                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> "Now I said CLI over MCP — but there are two exceptions. Two MCP servers that I install on EVERY project because they add capabilities that CLIs can't match:
>
> **Context7** — real-time documentation. Claude can fetch the latest docs for any library. React 19 hooks? Next.js 15 server actions? Supabase v2 realtime? Always current. No more hallucinated APIs.
>
> **Playwright MCP** — browser automation. Claude can literally see your app. Click buttons, fill forms, take screenshots, verify that the UI actually works. Combine this with SpecWeave's test-embedded tasks, and you get end-to-end verification.
>
> These two? Install them. They're exceptions to the 'CLI over MCP' rule because they add capabilities you simply can't get from a CLI."

**[SCREEN: Back to main flow]**

> "Okay — plugins, skills, agents, marketplace, hooks, CLI over MCP with two exceptions. That's the Claude Code foundation.
>
> SpecWeave leverages all of this. Every increment you create uses skills for guidance, agents for complex tasks, hooks for automation, and CLIs for external integrations."

### 7. Recent Claude Code Optimizations (2025-2026)

**[EXCALIDRAW: Recent Optimizations]**

```
┌─────────────────────────────────────────────────────────────────────┐
│                CLAUDE CODE RECENT OPTIMIZATIONS                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  v2.1.6 (Jan 2026)                                                  │
│  • Automatic skill discovery from nested directories                 │
│  • Date range filtering in /stats                                   │
│                                                                      │
│  v2.1.3 (Jan 2026)                                                  │
│  • Skills and commands merged (simpler mental model)                │
│  • Release channel toggle (stable/latest)                           │
│                                                                      │
│  v2.1.0 (Dec 2025)                                                  │
│  • Skill hot-reload (instant updates without restart)               │
│  • context: fork for isolated skill execution                       │
│                                                                      │
│  v2.0.72 (Dec 2025)                                                 │
│  • 3x faster @ mention file suggestions                             │
│  • Chrome browser control (Beta)                                    │
│                                                                      │
│  v2.0.64 (Dec 2025)                                                 │
│  • Instant auto-compacting                                          │
│  • Named sessions (/rename, /resume)                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> "The Claude Code team ships updates weekly. These optimizations directly benefit SpecWeave users — skill hot-reload means you can customize skills without restarting, context fork means skills can run isolated when needed, faster file suggestions make @-mentions instant."

### 7.5 Claude Code Global Settings - Explanatory and Thinking

**[SCREEN: Show ~/.claude/settings.json in editor]**

> "Quick pro tip that most people miss — Claude Code has global settings that dramatically change how Claude communicates with you."

**[TERMINAL: Show settings file location]**

```bash
# Open your global Claude Code settings
cat ~/.claude/settings.json
```

> "Two settings I recommend enabling:
>
> **Explanatory mode** — Claude explains what it's doing and why. Instead of silently editing files, it tells you: 'I'm updating the auth service to add JWT validation because...'
>
> **Thinking mode** — Shows Claude's reasoning process. You see the chain of thought — what options it considered, why it chose one approach over another.
>
> Both are disabled by default. Enable them in your global settings:"

**[TERMINAL: Show settings configuration]**

```json
// ~/.claude/settings.json
{
  "preferences": {
    "verboseResponses": true,
    "showThinking": true
  }
}
```

> "Why does this matter? **Learning**. When you see Claude's reasoning, you learn faster. You understand not just WHAT it built, but WHY.
>
> For experienced developers — you might disable these after a while. But when learning SpecWeave, or any new codebase? Keep them on. The transparency is invaluable."

### 8. Anthropic Defines Industry Standards

**[SCREEN: Show agentskills.io homepage]**

> "Here's something important to understand: Anthropic doesn't just USE standards — they DEFINE them. Let me show you what I mean."

**[EXCALIDRAW: Anthropic's Industry Standards]**

```
┌─────────────────────────────────────────────────────────────────────┐
│           ANTHROPIC DEFINES THE STANDARDS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🔌 MCP (Model Context Protocol)                                    │
│     • Open standard for AI-to-service connections                   │
│     • Adopted by: OpenAI, Google, Microsoft                         │
│     • URL: modelcontextprotocol.io                                  │
│                                                                      │
│  ⚡ AGENT SKILLS                                                     │
│     • Open format for giving AI agents capabilities                 │
│     • Skills = folders with instructions, scripts, resources        │
│     • Build once → deploy across agent products                     │
│     • URL: agentskills.io                                           │
│                                                                      │
│  📦 CLAUDE CODE PLUGIN ARCHITECTURE                                 │
│     • Skills, agents, hooks, commands                               │
│     • Becoming the pattern for AI development tools                 │
│                                                                      │
│  THE PATTERN: Anthropic releases → Industry adopts → Standard forms │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

> "**MCP** — Model Context Protocol. Anthropic created it, then OpenAI, Google, and Microsoft adopted it. Now it's THE way to connect AI to external services.
>
> **Agent Skills** — just released at agentskills.io. An open format for giving AI agents reusable capabilities. Skills are folders containing instructions, scripts, and resources that agents can discover and load on-demand.
>
> Think about it: build a skill once, deploy it across ANY skills-compatible agent product. That's interoperability.
>
> SpecWeave was actually ahead of this trend — our SKILL.md format predates the Agent Skills standard. But now we're aligned with it. Your SpecWeave skills? They follow the same patterns Anthropic is standardizing."

**[Point to the strategic advantage]**

> "Why does this matter? Because when you learn SpecWeave, you're learning patterns that are BECOMING industry standards. MCP, Agent Skills, plugin architecture — all pioneered by Anthropic, all foundational to SpecWeave.
>
> You're not learning a proprietary system. You're learning the future of AI development tooling."

> "Now let's see how SpecWeave's philosophy builds on top of this foundation."

---

## SECTION 2: CORE PHILOSOPHY (8:00 - 10:30)

**[SCREEN: Navigate to docs/overview/philosophy]**

> "Let me explain the eight principles that guide everything in SpecWeave."

**[READ through principles]**

> "**Principle 1: Specification Before Implementation**. Define WHAT and WHY before HOW. No more jumping straight to code.
>
> **Principle 2: Append-Only Snapshots + Living Documentation**. This is revolutionary — most systems make you choose between historical context OR current docs. SpecWeave gives you BOTH."

**[Point to the table explaining increments vs living docs]**

> "Increments are immutable snapshots — like Git commits for features. Living docs are always current, auto-updated by hooks. Both are essential.
>
> **Principle 3: Context Precision**. 70% token reduction. Load only what you need.
>
> **Principle 4: Test-Validated Features**. Every feature proven through tests. Embedded in your tasks.
>
> **Principle 5: Regression Prevention**. Document before you modify brownfield code.
>
> **Principle 6: Scalable**. Works for solo developers or 100-person teams.
>
> **Principle 7: Auto-Role Routing**. Skills detect what you need automatically. Over 90% routing accuracy.
>
> **Principle 8: Closed-Loop Validation**. E2E tests must tell the truth. No false positives."

---

## SECTION 2.5: WHY NOT BMAD OR SPECKIT? (10:30 - 12:00)

**[SCREEN: Show comparison table]**

> "Now you might be wondering — why SpecWeave? There are other frameworks out there. BMAD, SpecKit, Cursor Rules. Great tools. I used them before building this."

**[EXCALIDRAW: Comparison diagram]**

```
┌─────────────────────────────────────────────────────────────┐
│           WHY SPECWEAVE vs ALTERNATIVES?                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📂 PERMANENT, NOT EPHEMERAL                                │
│  Other tools → chat history. SpecWeave → permanent files.   │
│  spec.md + plan.md + tasks.md. Searchable forever.          │
│                                                              │
│  🔄 FULL LIFECYCLE, NOT SNAPSHOTS                           │
│  BMAD/SpecKit = single-use generation.                      │
│  SpecWeave = 140+ increments with pause, resume, abandon,   │
│  reopen, quality gates, and multi-hour autonomous execution.│
│                                                              │
│  🔗 EXTERNAL SYNC BUILT-IN                                  │
│  Bidirectional sync with GitHub, JIRA, Azure DevOps.        │
│  Other tools require manual updates or custom integrations. │
│                                                              │
│  🏢 BROWNFIELD-READY                                        │
│  10-year legacy codebase? SpecWeave analyzes it, detects    │
│  doc gaps, imports from Notion/Confluence.                  │
│  Others assume greenfield only.                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

> "Four key differences:
>
> **First**: Other tools generate into chat history. SpecWeave creates permanent files — spec.md, plan.md, tasks.md. Searchable forever.
>
> **Second**: BMAD and SpecKit are single-use. Generate once, done. SpecWeave manages full lifecycle — 140+ increments with pause, resume, abandon, reopen, quality gates, and hours of autonomous execution.
>
> **Third**: External sync is built in. Push to GitHub Issues, JIRA, Azure DevOps. Pull status back. Bidirectional. Other tools require manual updates.
>
> **Fourth**: Brownfield-ready. Have a 10-year legacy codebase? SpecWeave analyzes it, detects documentation gaps, imports from Notion or Confluence. Other tools assume you're starting fresh.
>
> Here's the math: SpecKit output equals ONE SpecWeave increment. SpecWeave equals N increments plus lifecycle plus sync plus hooks plus hours of autonomous execution."

---

## SECTION 3: THE THREE-FILE STRUCTURE (12:00 - 14:30)

**[SCREEN: Navigate to docs/guides/lessons/02-three-file-structure]**

> "This is the foundation of SpecWeave — three files that replace chaos with clarity."

**[Point to the diagram showing spec.md, plan.md, tasks.md]**

> "**spec.md** is WHAT — owned by PM/Product. Business language. User stories, acceptance criteria.
>
> **plan.md** is HOW — owned by Architect. Technical language. Architecture, ADRs, design decisions.
>
> **tasks.md** is DO — owned by Developer. Checkboxes, embedded tests, implementation steps."

**[SCROLL to the Click Counter example]**

> "Let's see a real example. Adding a click counter to a homepage."

**[READ the spec.md example]**

> "The spec has user stories — 'As a visitor, I want to click a button that increments a counter.' And acceptance criteria with IDs — AC-US1-01: Button displays 'Click me!', AC-US1-02: Counter starts at 0."

**[READ the tasks.md example]**

> "The tasks reference those AC-IDs. Task T-001 satisfies AC-US1-01 through AC-US1-04. And look — test cases are embedded right in the task. Not 'add tests later.' Tests ARE the task."

**[EXCALIDRAW TRANSITION: Three files connected with AC-ID arrows]**

> "The magic is traceability. AC-IDs connect requirements to tasks to tests. Six months later, you can answer: 'Why did we build it this way?' Just read the increment."

---

## SECTION 4: WHAT IS AN INCREMENT (13:30 - 16:00)

**[SCREEN: Navigate to docs/guides/core-concepts/what-is-an-increment]**

> "An increment is SpecWeave's fundamental unit of work. Think of it as a Git commit for features."

**[Point to the mermaid diagram showing increment sequence]**

> "Each increment contains complete context — spec, plan, tasks, logs, reports. Everything needed to understand why something was built and how."

**[SCROLL to "Anatomy of an Increment"]**

```
.specweave/increments/0001-user-authentication/
├── spec.md     # WHAT: Requirements, user stories, AC-IDs
├── plan.md     # HOW: Architecture + test strategy
├── tasks.md    # Checklist + embedded tests
├── logs/       # Execution history
└── reports/    # Completion summaries
```

**[SCROLL to "Why Increments?"]**

> "Three reasons:
>
> 1. **Complete Context**. Every increment is a snapshot in time with all context preserved.
>
> 2. **Traceability**. Clear path from requirements to implementation to tests. Critical for compliance — HIPAA, SOC 2, FDA.
>
> 3. **Focused Work**. One increment at a time prevents context switching."

**[SCROLL to "Increment Sizing"]**

> "Golden rule: 5-15 tasks, 1-3 user stories. Small increments = faster feedback, better AI accuracy, achievable goals."

**[SCROLL to lifecycle state diagram]**

> "Increments have a lifecycle: Planning → Active → Paused/Completed/Abandoned. Each transition has a command."

---

## SECTION 5: INSTALLATION & FIRST INCREMENT (16:00 - 19:30)

**[SCREEN: Navigate to docs/guides/getting-started/quickstart]**

> "Let's get you running. The simplest path is a new project."

**[TERMINAL: Show greenfield installation]**

```bash
npm install -g specweave
mkdir my-app && cd my-app
specweave init .
```

**[Show init wizard running]**

> "The init wizard sets up your project structure. It works with greenfield AND brownfield projects."

**[HIGHLIGHT: Deep Interview Mode prompt in init wizard]**

> "Here's a new feature that's a game-changer — Deep Interview Mode. During init, you'll see this prompt:"

```
Deep Interview Mode

For big features, Claude can ask 40+ questions about architecture,
integrations, UI/UX, and tradeoffs before creating specifications.

Enable Deep Interview Mode? [y/N]
```

> "When enabled, before creating ANY spec, Claude conducts a thorough interview. Architecture decisions, external integrations, UI/UX concerns, performance requirements, security considerations, edge cases. 10 to 40+ questions depending on feature complexity.
>
> This is inspired by Thariq — the creator of Claude Code himself — who shared that for big features, Claude asks him 40+ questions and he ends up with a much more detailed spec that he feels in control of.
>
> Want to feel in control of your specs? Enable Deep Interview Mode."

**[TERMINAL: Natural language approach]**

> "For a brand new project, just describe what you want:"

```
"Build a calculator app with React"
```

> "SpecWeave guides you through features, tech stack, and approach — then creates your first increment automatically. Perfect for prototypes and weekend MVPs."

**[SCREEN: Back to quickstart, scroll to "Adding Features"]**

> "For existing projects, use explicit commands:"

**[TERMINAL: Explicit command approach]**

```bash
cd your-project
specweave init .
/sw:increment "Add dark mode toggle"
```

> "Watch what happens. SpecWeave creates a complete specification."

**[NAVIGATE to increment folder]**

> "Three files created — spec.md, plan.md, tasks.md. Each with proper structure, user stories, acceptance criteria, architecture decisions, implementation tasks with embedded tests."

> "After init, you get **136 auto-activating skills**, **68 specialized agents** (PM, Architect, DevOps, QA, Security, SRE), **53 slash commands** for workflow control, event-driven hooks for automation, and your own CLAUDE.md project reference."

**[TERMINAL: Execute and close]**

```bash
/sw:auto      # Autonomous execution for hours
/sw:done 0001 # Close with quality gates
```

> "Quality gates verify: all tasks complete, test coverage above 60%, living docs updated. Only then does it close."

**[SCREEN: Show the :next command section]**

```bash
/sw:next
```

> "Pro tip: This one command auto-closes completed work and suggests what's next. Just keep clicking 'next'."

---

## SECTION 6: LIVING DOCS FOR AI CONTEXT (19:30 - 21:00)

**[SCREEN: Navigate to docs/guides/core-concepts/who-benefits-from-living-docs]**

> "Here's something most people miss — living docs aren't just for humans. They're context for AI."

**[SCROLL to the Progressive Disclosure section]**

> "SpecWeave uses Claude's native progressive disclosure. No RAG. No vector databases. Just smart file organization and grep searches.
>
> Here's how it works."

**[Point to the flow diagram]**

> "When you ask Claude to implement something, three mechanisms kick in:
>
> 1. **CLAUDE.md** is always loaded. It tells Claude: 'Before implementing, check existing docs.'
>
> 2. **The living-docs-navigator skill** activates. It's a built-in skill that shows Claude WHERE to look and HOW to search.
>
> 3. Claude uses grep — yes, plain grep — to search your living docs for relevant specs and ADRs."

**[TERMINAL: Show the flow]**

```bash
# Claude internally runs:
grep -ril "auth" .specweave/docs/internal/

# Finds:
# - specs/us-001-authentication.md
# - architecture/adr/0001-jwt-auth.md
# - architecture/auth-flow.md
```

> "Then Claude reads exactly those files. Not everything. Just what's relevant."

**[SCROLL to "Why Not RAG?"]**

> "Why not RAG or vector databases?
>
> Progressive disclosure is simpler — no infrastructure.
> More accurate — reads actual files, not embeddings.
> Always current — no index to update.
> Zero cost — it's native Claude.
>
> And here's a performance trick SpecWeave uses — **LSP integration**.
>
> LSP — Language Server Protocol — gives Claude semantic code understanding. Instead of grepping for text, Claude asks the LSP: 'Where is this function defined?' 'Show me all references to this class.' 'What's the type signature?'
>
> Speed comparison: Finding all references to a function across 500 files — grep takes 2-3 seconds, LSP returns in 50 milliseconds. That's **50x faster** with perfect accuracy.
>
> SpecWeave's living-docs-navigator skill uses LSP automatically for TypeScript, JavaScript, Python, Go, Rust. Semantic search instead of text search.
>
> Your living docs automatically become AI context. No extra work."

---

## SECTION 7: THE COMPLETE WORKFLOW (21:00 - 23:00)

**[SCREEN: Navigate to docs/workflows/overview]**

> "Let me show you the complete development journey."

**[Point to the mermaid diagram showing all phases]**

> "Seven phases: Concept → Research → Design → Planning → Implementation → Validation → Deployment.
>
> Each phase has clear inputs, outputs, and SpecWeave commands."

**[SCROLL through each phase briefly]**

> "Research produces user personas and feature lists. Design produces architecture and ADRs. Planning creates the three files. Implementation uses `/sw:do`. Validation runs `/sw:validate`. Deployment is your CI/CD."

**[Point to the phase diagram for Planning → Implementation]**

> "The key transition: `/sw:increment` creates spec + plan + tasks. `/sw:do` builds it. Hooks update living docs after every task."

---

## SECTION 8: EXTERNAL TOOL SYNC (23:00 - 25:00)

**[SCREEN: Navigate back to intro.md, scroll to External Tool Integration table]**

> "SpecWeave doesn't replace your existing tools — it synchronizes with them."

**[Point to the table]**

> "GitHub Issues: create, update, close, progress sync, checkbox tracking.
> JIRA: Epic and Story hierarchy, status sync, custom fields.
> Azure DevOps: Work items, area paths, status sync.
> Linear: Coming Q1 2026."

**[SCREEN: Navigate to docs/guides/lessons/07-external-tools]**

> "Bidirectional sync means: update status in JIRA, SpecWeave sees it. Complete a task in SpecWeave, your GitHub issue updates."

**[TERMINAL: Show sync commands]**

```bash
/sw:sync-progress  # Push updates to external tools
/sw:sync-monitor   # See sync status dashboard
```

> "Your JIRA updates. Your GitHub issues update. No manual copying. Ever."

---

## SECTION 9: BROWNFIELD PROJECTS (25:00 - 27:00)

**[SCREEN: Navigate to docs/workflows/brownfield]**

> "What about existing codebases? This is the ultimate challenge — and SpecWeave handles it."

**[Point to the brownfield challenge mermaid diagram]**

> "Common problems: no documentation, tribal knowledge, fear of breaking production, scattered docs, unknown architecture decisions, no tests."

**[SCROLL to "The SpecWeave Brownfield Approach"]**

> "Two paths based on project size:
>
> **Quick Start** for large projects (50k+ LOC): Document core only, start immediately, docs grow with changes.
>
> **Comprehensive** for smaller projects: Full docs, baseline tests, then increments."

**[SCROLL to init command section]**

```bash
specweave init .
# During init, select "Run brownfield analysis"
```

> "SpecWeave analyzes your codebase for documentation gaps. Then you turn gaps into increments."

```bash
/sw:discrepancies                    # View all documentation gaps
/sw:discrepancy-to-increment DISC-0001  # Create increment from gap
```

**[SCREEN: Show import docs section]**

```bash
/sw:import-docs ~/exports/notion --source=notion
```

> "Import from Notion, Confluence, GitHub Wiki. AI classifies docs automatically."

---

## SECTION 10: QUALITY GATES & TDD (27:00 - 29:00)

**[SCREEN: Navigate to docs/guides/lessons/05-quality-gates]**

> "SpecWeave enforces quality before shipping. Three gates."

**[READ the three gates]**

> "**Gate 1: Tasks**. All tasks marked complete with checkboxes.
>
> **Gate 2: Tests**. Minimum 60% coverage enforced. Tests embedded in tasks, not afterthoughts.
>
> **Gate 3: Documentation**. Living docs auto-updated via hooks."

**[SCREEN: Navigate to docs/guides/lessons/06-tdd-workflow]**

> "If you want test-first development, SpecWeave has a full TDD workflow."

```bash
/sw:tdd-cycle  # Full red-green-refactor workflow
```

> "Red: write failing tests. Green: make them pass. Refactor: improve without breaking. SpecWeave guides you through each phase."

---

## SECTION 11: THE LEARNING PATH (29:00 - 31:00)

**[SCREEN: Navigate to docs/guides/lessons/index (SpecWeave Academy)]**

> "If you're new, we have a complete learning path. 16 lessons from beginner to expert."

**[Point to the paths table]**

> "**Path 1: Getting Started** — Lessons 1-3. Install, understand the three files, build your first increment. 90 minutes.
>
> **Path 2: Core Workflow** — Lessons 4-5. Master the :next command and quality gates.
>
> **Path 3: Testing** — Lesson 6. TDD with SpecWeave.
>
> **Path 4: Integration** — Lessons 7-10. External tools, AI model selection, troubleshooting, advanced patterns.
>
> **Path 5: Deep Dive** — Lessons 11-16. Vibe coding problem, init deep dive, increment lifecycle, GitHub/JIRA/ADO integrations."

**[SCREEN: Navigate to docs/academy if exists]**

> "For complete beginners to software engineering, we have the full Academy. 14 parts, 44 modules — from single-file scripts to microservices with CI/CD."

---

## SECTION 12: DOGFOODING - REAL METRICS (31:00 - 33:30)

**[SCREEN: Navigate to docs/overview/dogfooding]**

> "Now the proof. SpecWeave builds SpecWeave using SpecWeave."

**[Point to the numbers]**

> "186,719 lines of code. 567 TypeScript files. 581 test files. 4,405 documentation files. 47 CLI commands. 24 plugins. 65 hooks."

**[Point to development activity]**

> "1,327 commits over 52 days. 26 commits per day average. 100 commits in a single peak day.
>
> Every weekend. Many sleepless nights. This wasn't a side project — it was an obsession."

**[Point to DORA metrics]**

> "The result:
> - **Deployment Frequency**: 100/month (Elite tier)
> - **Lead Time**: 3.4 hours (High tier)
> - **Change Failure Rate**: 0% across 65 releases (Elite tier)
> - **MTTR**: N/A because nothing failed"

> "5+ production applications built with SpecWeave — including SpecWeave itself, BizZone mobile app, Event Management SaaS, and more.
>
> This isn't a demo framework. It's production-tested — on itself.
>
> And speaking of real-world AI automation — Boris Cherny, the creator of Claude Code at Anthropic, recently shared something remarkable: he didn't open his IDE even once for an entire month. Every commit — 259 pull requests, 497 commits, 40,000 lines added — was written entirely by Claude Code using autonomous execution with stop hooks.
>
> But here's what's really exciting: Claude Code itself has made massive leaps forward recently. Two game-changing features:
>
> **First, the compact command** — this is huge for VSCode users. Before, you'd have to keep switching between terminal and editor windows, constantly losing context. Now with compact mode, Claude Code lives right inside your VSCode window. You can work continuously for hours, even days, without context switching. It's the same persistent session, the same window, zero interruptions.
>
> **Second, STOP hooks** — and they work with subagents too. This means you can set up autonomous workflows where Claude spawns specialized agents, those agents do their work, and your stop hooks validate the results before allowing the session to complete. It's quality gates at every level of execution.
>
> We're living in an era where AI tools don't just assist with coding — they execute standard procedures, write production code, and run for hours or days at a time without human intervention. With these new Claude Code capabilities, that future is here now. SpecWeave is built for this new reality. It gives AI the structure it needs to work autonomously while maintaining quality, traceability, and team alignment."

---

## SECTION 12.5: SELF-IMPROVING SKILLS (33:30 - 35:30)

**[SCREEN: Navigate to docs/guides/self-improving-skills]**

> "Now here's something truly game-changing — and I saved the best for almost last. Self-improving skills."

**[EXCALIDRAW: The Memory Problem diagram]**

```
┌─────────────────────────────────────────────────────┐
│              THE MEMORY PROBLEM                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│   Monday: "Don't use that button, use our component"│
│                      ↓                               │
│   Tuesday: [Same mistake]                            │
│                      ↓                               │
│   Wednesday: [Same correction]                       │
│                      ↓                               │
│   Forever: Repeating yourself                        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

> "Every LLM session starts from zero. Monday you correct Claude about button usage. Tuesday, same mistake. Wednesday, same correction. Without memory, you're repeating yourself forever.
>
> This isn't a Claude problem — it's every AI tool. Naming conventions, logging patterns, component usage — you correct once, but tomorrow it forgets."

**[SCROLL to How It Works section]**

> "SpecWeave's Reflect system solves this with a deceptively simple approach."

**[READ the flow]**

> "When you make a correction during a session — 'No, always use our Button component' — Reflect detects that signal. It extracts the learning, categorizes it, and saves it to a skill memory file.
>
> Next session, when that skill loads, Claude reads both the SKILL.md AND the MEMORY.md. Your correction is now permanent knowledge."

**[TERMINAL: Show commands]**

```bash
# Enable auto-learning
/sw:reflect-on

# Manual reflection after any session
/sw:reflect

# Check what Claude has learned
/sw:reflect-status
```

**[Point to the memory file example]**

```markdown
# frontend Skill Memory

### component-usage

#### LRN-2026-01-05-abc (High Confidence)
**Context**: User corrected button component usage
**Learning**: Always use `<Button variant='primary'>` for primary actions
**Triggers**: button, primary, action
```

> "This is just markdown. No embeddings, no vector databases, no complex infrastructure. Plain text files that Claude reads naturally.
>
> And here's the beautiful part — these files are version controlled. You can see how your AI evolves over time, roll back wrong learnings, share team knowledge."

**[EXCALIDRAW: Categories diagram]**

```
┌───────────────────────────────────────────────────────┐
│                 LEARNING CATEGORIES                    │
├───────────────────────────────────────────────────────┤
│                                                        │
│  🎨 component-usage    →  UI patterns, design system  │
│  🔌 api-patterns       →  REST, GraphQL, error codes  │
│  🧪 testing            →  Vitest, Playwright, mocks   │
│  🚀 deployment         →  Wrangler, Vercel, Supabase  │
│  🔐 security           →  Auth, validation, secrets   │
│  🗄️ database           →  Queries, schema, migrations │
│  📝 naming             →  Conventions, file structure │
│  🏗️ architecture       →  Patterns, design decisions  │
│                                                        │
└───────────────────────────────────────────────────────┘
```

> "Learnings are automatically categorized. Button corrections go to component-usage. API feedback goes to api-patterns. Test corrections go to testing.
>
> Each category maps to a skill, and each skill has its own memory file."

**[Point to Auto Mode integration]**

> "The magic happens when you combine this with auto mode. You run `/sw:auto`, Claude works autonomously. When the session ends, the stop hook triggers Reflect automatically. Any corrections you made during the session become permanent learning.
>
> Correct once, never again. That's the promise — and SpecWeave delivers."

**[TERMINAL: Show git integration]**

```bash
# See learning history
git log --oneline .specweave/skills/frontend/MEMORY.md

# View recent learnings
git diff HEAD~1 .specweave/skills/frontend/MEMORY.md

# Rollback a wrong learning
git checkout HEAD~1 -- .specweave/skills/frontend/MEMORY.md
```

> "Git integration means full traceability. You can see exactly when and why Claude learned something. If a learning was wrong, roll it back."

---

## SECTION 12.75: DEPLOYMENT PLATFORMS - THE $0 TO PRODUCTION STACK (35:30 - 38:30)

**[SCREEN: Navigate to docs/guides/deployment-platforms]**

> "Your increment is complete. Tests pass. Docs updated. Now — where do you deploy?
>
> And here's a question that matters more than you think: **Why NOT AWS, Azure, or GCP?**"

**[EXCALIDRAW: The Complexity Tax diagram]**

```
┌─────────────────────────────────────────────────────────────┐
│          AWS/AZURE/GCP: THE COMPLEXITY TAX                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ❌ 200+ services to learn                                  │
│  ❌ IAM policies, VPCs, security groups                     │
│  ❌ Surprise bills (forgot to turn off that Lambda?)        │
│  ❌ Cold starts in seconds                                   │
│  ❌ Requires dedicated DevOps knowledge                      │
│                                                              │
│  WHEN TO USE:                                                │
│  • Enterprise with FedRAMP compliance                        │
│  • Existing infrastructure lock-in                           │
│  • Specialized services (SageMaker, BigQuery)                │
│  • When you have a dedicated DevOps team                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

> "If your DevOps team is just you, don't pick a stack that expects deep knowledge of IAM policies and VPC peering. Use tools that let you stay in **dev mode**, not **ops mode**."

**[EXCALIDRAW: The $0 Stack]**

```
┌─────────────────────────────────────────────────────────────┐
│              THE $0 TO PRODUCTION STACK                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend    →  Cloudflare Pages (unlimited) or Vercel      │
│  Backend     →  Cloudflare Workers (100K/day)               │
│  Database    →  Supabase (500MB + 50K MAU)                  │
│  Storage     →  Cloudflare R2 (10GB + $0 egress)            │
│  Auth        →  Supabase Auth (50K MAU included)            │
│  Git/CI      →  GitHub (unlimited repos)                    │
│                                                              │
│  TOTAL MONTHLY COST: $0                                      │
│  (until you have real traction)                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

> "This exact stack — Cloudflare + Supabase + GitHub — powers most of the apps I showed you. Zero dollars until you have paying customers. That's the modern way."

**[Point to the Quick Decision flowchart]**

> "Let me break down the key players. You have six options, and they each have a sweet spot."

**[EXCALIDRAW: Platform comparison]**

```
┌─────────────────┬─────────────────┬─────────────────┐
│     VERCEL      │   CLOUDFLARE    │    SUPABASE     │
├─────────────────┼─────────────────┼─────────────────┤
│  Next.js Native │  Unlimited BW   │  Real Postgres  │
│  Best DX        │  100K/day APIs  │  Auth Built-in  │
│  $20/user       │  $5/team flat   │  $25/project    │
│  NO commercial  │  Commercial OK  │  Realtime       │
│  on free tier   │  on free tier   │  Row-Level Sec  │
└─────────────────┴─────────────────┴─────────────────┘
```

> "Key takeaways:
>
> **Vercel** — best developer experience for Next.js. But the hobby tier is **personal, non-commercial only**. If you're building a product, you need Pro at $20 per user per month.
>
> **Cloudflare** — unlimited bandwidth, 100K requests per DAY not month, and commercial use on free tier. That's huge for startups.
>
> **Supabase** — the open-source Firebase alternative with REAL PostgreSQL. Auth, realtime, storage, edge functions — all in one. 50K monthly active users on free tier.
>
> **Railway and Render** — when you need real containers, background jobs, or traditional backends. Heroku successors.
>
> **Netlify** — JAMstack pioneer, great for forms-heavy sites."

**[Point to Decision Matrix]**

> "Here's my mental model:
>
> - **Next.js SaaS?** Vercel + Supabase
> - **High-traffic API?** Cloudflare Workers + Supabase
> - **Mobile backend?** Supabase alone — auth, realtime, storage all-in-one
> - **Startup MVP?** Cloudflare + Supabase for $0 until traction
> - **Custom Python/Ruby?** Railway or Render
> - **Static docs?** Cloudflare Pages — unlimited bandwidth, free forever"

**[SCROLL to Cloudflare Serverless Ecosystem section]**

> "Now let me show you why Cloudflare is my default choice for APIs — it's not just hosting. It's a complete serverless stack at the edge."

**[EXCALIDRAW: Cloudflare ecosystem diagram]**

```
┌─────────────────────────────────────────────────────┐
│              CLOUDFLARE EDGE (200+ locations)        │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│   │ Workers  │    │    D1    │    │    KV    │      │
│   │ Compute  │◄──►│  SQLite  │    │Key-Value │      │
│   └────┬─────┘    └──────────┘    └──────────┘      │
│        │                                             │
│        │          ┌──────────┐                       │
│        └─────────►│    R2    │                       │
│                   │ Storage  │                       │
│                   │ $0 egress│                       │
│                   └──────────┘                       │
└─────────────────────────────────────────────────────┘
```

> "Four primitives that let you build complete apps:
>
> **Workers** — your code runs at the edge, 200+ locations, sub-millisecond cold starts. Write TypeScript, deploy globally.
>
> **D1** — SQLite at the edge. A real SQL database, no server to manage. 5GB free, 5 million reads per day.
>
> **KV** — key-value store for sessions, feature flags, cached data. 100K reads per day free.
>
> **R2** — S3-compatible object storage with ZERO egress fees. Store files, images, backups. No bandwidth charges ever.
>
> Think about that — database, storage, compute, all at the edge, all on free tier. You can build a complete SaaS without paying a cent until you scale."

**[Point to the "When to Use Each" table]**

> "Quick mental model:
> - Need to store user data? D1.
> - Need fast session lookups? KV.
> - Need to store files? R2.
> - Need to run code? Workers.
>
> They all work together. One `wrangler.toml` file configures everything."

**[TERMINAL: Quick deploy commands]**

```bash
# After /sw:done completes...

# Vercel (auto-detects framework)
vercel

# Cloudflare Pages
wrangler pages deploy dist

# Cloudflare Workers (with D1, KV, R2)
wrangler deploy
```

> "Both integrate with GitHub. Push your increment, deployment happens automatically."

**[Point to the deployment flow diagram]**

> "Notice the pattern: `/sw:done` validates quality gates, pushes to git, webhook triggers deployment. Your code ships only after SpecWeave confirms it's ready."

---

## SECTION 13: AUTONOMOUS MODE DEEP DIVE (38:30 - 43:30)

**[SCREEN: Navigate to docs/guides/autonomous-mode]**

> "Now let's talk about the feature that changes everything — autonomous mode. This is where SpecWeave becomes truly hands-off."

**[TERMINAL: Show the command]**

```bash
/sw:auto
```

> "One command. That's it. Claude takes over and executes every task in your increment until they're all complete.
>
> But here's what makes this different from just running commands in a loop — visibility."

**[Point to the label visibility feature]**

> "SpecWeave has something we call 'box art' — visual labels that show you exactly what's happening at every moment."

**[TERMINAL: Show example box art output]**

```
╔══════════════════════════════════════════════════════════════╗
║  🔄 AUTO SESSION CONTINUING                                  ║
║  🤖 Main Orchestrator                                        ║
╠══════════════════════════════════════════════════════════════╣
║  Why: Work incomplete, continuing...                         ║
║  Iteration: 42/2500                                         ║
║  🎯 WHEN WILL SESSION STOP?                                  ║
║  ├─ Mode: STANDARD MODE                                     ║
║  └─ Criteria: ALL tasks [x] completed + tests passing       ║
║  ✅ Tests: 42 passed, 0 failed                              ║
╚══════════════════════════════════════════════════════════════╝
```

> "Look at this output. You can see:
>
> - Which iteration you're on — 42 out of a maximum 2500
> - The stopping criteria — all tasks complete plus tests passing
> - Current test status — 42 passed, zero failed
> - The mode — standard or extended
>
> No more guessing. No more wondering 'what is Claude doing right now?'"

**[SCROLL to Stop Conditions section]**

> "When does auto mode stop? Four conditions."

**[READ the conditions]**

> "**Condition 1**: All tasks marked complete. Every checkbox in tasks.md is checked.
>
> **Condition 2**: Tests pass. Not just 'some tests' — the configured test suite must pass.
>
> **Condition 3**: Maximum iterations reached. Default is 2500, but you can configure this.
>
> **Condition 4**: Manual interrupt. Close the session or use `/sw:cancel-auto`."

**[Point to safety mechanisms]**

> "Safety is built in at every level.
>
> - **Circuit breaker**: If an external API fails 3 times, auto mode queues it and continues with other tasks.
> - **Human gates**: Certain operations ALWAYS require human approval — publishing packages, force-pushing, production deployments, database migrations.
> - **Test validation**: Auto mode won't mark a task complete if its tests fail."

**[TERMINAL: Show status command]**

```bash
/sw:auto-status
```

> "While auto mode runs, you can check status anytime. It shows progress, current task, test results, estimated time remaining."

**[Point to when-to-use guidance]**

> "When should you use auto versus manual `/sw:do`?
>
> Use **auto mode** for:
> - Well-defined increments with clear tasks
> - Feature development with good test coverage
> - Overnight or weekend work sessions
> - When you trust the spec is complete
>
> Use **manual `/sw:do`** for:
> - Exploratory work
> - Complex architectural decisions
> - When you want to review each step
> - New or unfamiliar codebases"

**[EXCALIDRAW: Auto mode flow diagram]**

```
┌─────────────────────────────────────────────────────────┐
│                    AUTO MODE FLOW                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   /sw:auto                                               │
│       │                                                  │
│       ▼                                                  │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│   │ Pick     │───►│ Execute  │───►│ Test     │          │
│   │ Task     │    │ Task     │    │ Task     │          │
│   └──────────┘    └──────────┘    └────┬─────┘          │
│       ▲                                │                │
│       │           ┌──────────┐         │                │
│       └───────────│ Pass?    │◄────────┘                │
│                   └────┬─────┘                          │
│                        │                                │
│              ┌─────────┴─────────┐                      │
│              ▼                   ▼                      │
│         [✓ Mark Complete]   [✗ Fix & Retry]             │
│              │                   │                      │
│              ▼                   │                      │
│         All done? ───────────────┘                      │
│              │                                          │
│              ▼                                          │
│         [SESSION COMPLETE]                              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> "The loop is simple: pick task, execute, test. If tests fail, fix and retry. If they pass, mark complete. Repeat until done."

---

## SECTION 14: MULTI-REPO COORDINATION (43:30 - 47:30)

**[SCREEN: Navigate to docs/guides/multi-repo-projects]**

> "Real applications aren't monoliths anymore. You have frontend, backend, shared libraries — sometimes in separate repositories.
>
> SpecWeave handles this with umbrella projects."

**[Point to the folder structure diagram]**

```
my-project/                    # Umbrella root
├── .specweave/                # Config at umbrella level
│   ├── config.json
│   └── increments/
│       └── 0001-auth/
│           ├── spec.md        # Single spec spanning repos
│           ├── plan.md
│           └── tasks.md
└── repositories/              # All repos cloned here
    ├── frontend/              # React app
    ├── backend/               # Node.js API
    └── shared/                # Common types/utils
```

> "Notice the structure. The `.specweave` folder lives at the umbrella level, not inside individual repos. One spec, one plan, one tasks file — coordinating work across ALL your repositories."

**[TERMINAL: Show setup]**

```bash
mkdir my-project && cd my-project
specweave init .

mkdir repositories
cd repositories
git clone https://github.com/yourorg/frontend
git clone https://github.com/yourorg/backend
git clone https://github.com/yourorg/shared
```

> "Clone all your repos into the `repositories/` folder. SpecWeave automatically discovers them."

**[Point to cross-repo task example]**

> "Here's where it gets powerful. Let's say you're adding authentication."

**[TERMINAL: Show spec example]**

```markdown
### US-001: User Authentication
**As a** user, I want to log in securely
**So that** I can access my account

#### Acceptance Criteria
- [ ] **AC-US1-01**: Frontend login form validates input
- [ ] **AC-US1-02**: Backend /auth/login endpoint issues JWT
- [ ] **AC-US1-03**: Shared types define AuthToken interface
```

> "One user story. Three repositories. The tasks file shows exactly which repo each task belongs to."

**[TERMINAL: Show tasks example]**

```markdown
### T-001: Create AuthToken interface
**User Story**: US-001 | **Repo**: shared
**Satisfies ACs**: AC-US1-03
**Files**: repositories/shared/src/types/auth.ts

### T-002: Implement login endpoint
**User Story**: US-001 | **Repo**: backend
**Satisfies ACs**: AC-US1-02
**Files**: repositories/backend/src/routes/auth.ts

### T-003: Build login form component
**User Story**: US-001 | **Repo**: frontend
**Satisfies ACs**: AC-US1-01
**Files**: repositories/frontend/src/components/LoginForm.tsx
```

> "SpecWeave executes these in dependency order. Shared types first — because frontend and backend depend on them. Then backend. Then frontend."

**[Point to dependency handling]**

> "Cross-repo dependencies are handled automatically. When you update the shared library, SpecWeave knows to:
>
> 1. Build the shared package
> 2. Update package.json in frontend and backend
> 3. Run npm install in consuming repos
> 4. Re-run tests to catch breaking changes"

**[TERMINAL: Show the sync]**

```bash
# After completing shared library changes
npm run build         # In shared/
npm link              # Make available locally

# Frontend picks it up
cd ../frontend
npm link @yourorg/shared
npm test              # Verify integration
```

> "And here's the key insight — your increment spec captures the coordination. Six months later, you can read the spec and understand how authentication was implemented across all three repos."

---

## SECTION 15: EXTERNAL SYNC DEEP DIVE (47:30 - 50:30)

**[SCREEN: Navigate to docs/workflows/github-sync]**

> "Earlier I mentioned external sync. Let's see it in action."

**[TERMINAL: Show the sync command]**

```bash
/sw-github:sync 0001
```

> "This creates GitHub issues from your increment. Each user story becomes an issue. Each task becomes a checkbox within that issue."

**[SCREEN: Show GitHub issue example]**

```
Issue Title: [FS-001][US-001] User Authentication

## User Story
As a user, I want to log in securely...

## Acceptance Criteria
- [ ] AC-US1-01: Frontend validates input
- [ ] AC-US1-02: Backend issues JWT
- [ ] AC-US1-03: Shared types defined

## Tasks
- [ ] T-001: Create AuthToken interface
- [ ] T-002: Implement login endpoint
- [ ] T-003: Build login form
```

> "The issue is formatted for humans. Anyone on your team can understand what's being built just by reading the issue."

**[Point to bidirectional sync]**

> "But here's what makes this powerful — bidirectional sync."

**[EXCALIDRAW: Bidirectional sync flow]**

```
┌─────────────────────────────────────────────────────────┐
│                BIDIRECTIONAL SYNC                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│    SpecWeave                      GitHub                 │
│   ┌──────────┐                ┌──────────┐              │
│   │ tasks.md │ ──────────────►│  Issue   │              │
│   │ [x] done │   /sw-github   │  ☑ done  │              │
│   └──────────┘     :sync      └──────────┘              │
│                                                          │
│   ┌──────────┐                ┌──────────┐              │
│   │ tasks.md │ ◄──────────────│  Issue   │              │
│   │ [x] done │   webhook or   │  ☑ done  │              │
│   └──────────┘   manual sync  └──────────┘              │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> "Complete a task in SpecWeave → GitHub issue updates. Check a box in GitHub → SpecWeave tasks.md updates.
>
> Your PM checks GitHub. Your developers use SpecWeave. Everyone stays in sync."

**[SCROLL to JIRA integration section]**

> "JIRA works the same way but with hierarchy mapping."

**[Point to mapping table]**

| SpecWeave | JIRA |
|-----------|------|
| Feature (FS-XXX) | Epic |
| User Story (US-XXX) | Story |
| Task (T-XXX) | Subtask |

> "Features become Epics. User stories become Stories. Tasks become subtasks. Your JIRA board reflects your SpecWeave structure automatically."

**[TERMINAL: Show JIRA commands]**

```bash
# Configure JIRA in config.json first
/sw-jira:sync 0001

# Monitor sync status
/sw:sync-monitor
```

> "And Azure DevOps? Same pattern. Work Items mirror your increments.
>
> The point is: use whatever tracking tool your team prefers. SpecWeave stays the source of truth, external tools are views into that truth."

---

## SECTION 16: REAL MOBILE APP EXAMPLE (50:30 - 55:30)

**[SCREEN: Navigate to a mobile app increment example]**

> "Let me show you something real — building a React Native app with SpecWeave."

**[Point to spec example]**

> "This is from BizZone, a business card scanning app. One of the 5+ production apps built with SpecWeave."

**[TERMINAL: Show the increment]**

```bash
cat .specweave/increments/0042-camera-scanner/spec.md
```

```markdown
---
increment: 0042-camera-scanner
title: "Business Card Camera Scanner"
---

### US-042: Scan Business Cards
**Project**: bizzone-mobile
**As a** salesperson at a conference
**I want to** scan business cards with my phone camera
**So that** I can capture contact info without manual entry

#### Acceptance Criteria
- [ ] **AC-US42-01**: Camera preview shows in full screen
- [ ] **AC-US42-02**: Capture button takes photo
- [ ] **AC-US42-03**: OCR extracts name, email, phone, company
- [ ] **AC-US42-04**: Extracted data populates contact form
- [ ] **AC-US42-05**: User can edit before saving
```

> "Notice the structure is identical to web apps. User story, acceptance criteria, clear testable requirements."

**[SCROLL to plan.md]**

> "The plan addresses mobile-specific architecture."

```markdown
## Architecture Decisions

### ADR-042-01: Camera Library Selection
**Decision**: Use expo-camera over react-native-camera
**Rationale**:
- Expo managed workflow = simpler builds
- Automatic permissions handling
- Better TypeScript support

### ADR-042-02: OCR Provider
**Decision**: Google Cloud Vision API
**Rationale**:
- Best accuracy for business cards
- Handles multiple languages
- Reasonable pricing (1000 free/month)
```

> "Mobile decisions documented just like any other architecture decision. Six months later, you know WHY you chose Expo over bare React Native."

**[TERMINAL: Show mobile-specific tasks]**

```markdown
### T-042-01: Set up Expo Camera
**Satisfies ACs**: AC-US42-01
**Files**: src/screens/ScanScreen.tsx, app.json
**Test Cases**:
  - Given app permissions granted
  - When ScanScreen mounts
  - Then camera preview displays full screen

### T-042-02: Implement capture flow
**Satisfies ACs**: AC-US42-02
**Files**: src/hooks/useCapture.ts
**Test Cases**:
  - Given camera is active
  - When user taps capture button
  - Then photo is saved to temporary storage
```

> "Same task format. Same embedded tests. The tests run on your simulator or device."

**[Point to Expo integration]**

> "Expo makes this seamless. The development workflow is:"

**[TERMINAL: Show workflow]**

```bash
# Start increment
/sw:increment "Add camera scanner"

# Execute with Expo running
npx expo start   # In one terminal
/sw:do           # In Claude Code

# Tests run against Expo
npm test         # Unit tests (Jest)
npm run e2e      # E2E tests (Maestro or Detox)

# Close and deploy
/sw:done 0042
eas build --platform ios
eas submit --platform ios
```

> "The cycle is the same: spec → implement → test → done. Expo handles the mobile complexity."

**[Point to mobile-specific skills]**

> "SpecWeave includes mobile-specific skills that auto-activate:"

```
sw-mobile:mobile-architect    → React Native architecture
sw-mobile:expo-specialist     → Expo-specific patterns
sw-mobile:ios-specialist      → iOS platform issues
sw-mobile:android-specialist  → Android platform issues
```

> "Ask about navigation patterns — mobile-architect activates. Ask about EAS builds — expo-specialist activates. The right expertise, automatically."

---

## SECTION 17: SELF-DOGFOODING & METRICS (55:30 - 58:30)

**[SCREEN: Navigate to .specweave/increments/ and show list]**

> "Earlier I showed you the dogfooding metrics. Let me show you the actual increments."

**[TERMINAL: List increments]**

```bash
ls .specweave/increments/ | head -30
```

```
0001-initial-setup/
0002-cli-foundation/
0003-increment-manager/
...
0153-label-visibility/
0154-memory-merge/
0155-reflect-enhancement/
```

> "150+ increments and counting. Every single feature in SpecWeave was built using SpecWeave.
>
> The CLI? Increment 0002. The hook system? Increment 0027. The GitHub sync? Increment 0089.
>
> Every decision documented. Every architectural choice recorded in ADRs."

**[TERMINAL: Show a random increment]**

```bash
cat .specweave/increments/0089-github-sync/spec.md
```

> "This is the GitHub sync feature. You can see the original requirements, what we shipped, what changed during implementation."

**[SCREEN: Navigate to .specweave/docs/internal/architecture/adr/]**

> "And the living docs? Let me show you."

**[TERMINAL: Count ADRs]**

```bash
ls .specweave/docs/internal/architecture/adr/ | wc -l
# Output: 74
```

> "74 Architecture Decision Records. Searchable. Current. Every major decision documented."

**[Point to DORA metrics explanation]**

> "Let me explain why DORA metrics matter."

**[EXCALIDRAW: DORA metrics diagram]**

```
┌─────────────────────────────────────────────────────────┐
│                    DORA METRICS                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │ Deployment      │    │ Lead Time       │             │
│  │ Frequency       │    │ for Changes     │             │
│  │ ────────────────│    │ ────────────────│             │
│  │ Elite: Daily+   │    │ Elite: <1 day   │             │
│  │ SpecWeave: 100  │    │ SpecWeave: 3.4h │             │
│  │ /month          │    │                 │             │
│  └─────────────────┘    └─────────────────┘             │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │ Change Failure  │    │ Mean Time to    │             │
│  │ Rate            │    │ Recovery        │             │
│  │ ────────────────│    │ ────────────────│             │
│  │ Elite: <5%      │    │ Elite: <1 hour  │             │
│  │ SpecWeave: 0%   │    │ SpecWeave: N/A  │             │
│  │                 │    │ (0 failures)    │             │
│  └─────────────────┘    └─────────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> "DORA — DevOps Research and Assessment — tracks four metrics that predict software delivery performance.
>
> **Deployment Frequency**: How often do you ship? Elite teams ship daily or more. SpecWeave: 100 per month — about 3 per day.
>
> **Lead Time**: From commit to production. Elite teams: under one day. SpecWeave: 3.4 hours average.
>
> **Change Failure Rate**: What percentage of deployments cause issues? Elite: under 5%. SpecWeave: zero percent across 65 releases.
>
> **Mean Time to Recovery**: When things break, how fast do you fix them? SpecWeave: not applicable — nothing has broken in production."

> "These aren't aspirational numbers. This is SpecWeave building SpecWeave. The framework proves itself."

---

## SECTION 18: ADVANCED FEATURES (58:30 - 61:30)

**[SCREEN: Navigate to docs/reference/hooks]**

> "Let me quickly cover three advanced features for power users."

**[Point to hooks system]**

> "**First: Hooks.** SpecWeave has an event-driven architecture with 65 hooks."

```bash
# Hooks fire automatically
task.completed     → Updates living docs
increment.created  → Validates structure
test.failed        → Logs failure context
```

> "You never call these directly. They fire when events happen. Task completes? Hook updates living docs. Increment created? Hook validates structure.
>
> You can extend with custom hooks for your workflow."

**[SCROLL to skills section]**

> "**Second: Skills auto-routing.** 136 skills that activate based on keywords."

```
"design the auth system"     → sw:architect activates
"review for security issues" → sw:security activates
"write API documentation"    → sw:docs-writer activates
```

> "Over 90% routing accuracy. You describe what you need, the right expertise appears."

**[TERMINAL: Show reflect command]**

> "**Third: Self-learning with Reflect.** We covered this earlier, but here's the key command."

```bash
/sw:reflect
```

> "This analyzes your session, extracts corrections and approvals, and saves them as permanent learning. Next session, Claude remembers.
>
> Enable auto-learning with `/sw:reflect-on`. Every session automatically learns from your feedback."

**[Point to the integration]**

> "These three features work together:
>
> - Hooks keep everything in sync
> - Skills route to the right expertise
> - Reflect makes that expertise better over time
>
> The result: an AI that learns your codebase, your preferences, your patterns."

---

## NEW CONCLUSION (61:30 - 63:30)

**[SCREEN: Navigate back to intro.md]**

> "We've covered a lot. Let me tell you exactly where to start."

**[TERMINAL: Show installation]**

```bash
npm install -g specweave
```

> "Step one: install. Global npm package, works on Mac, Linux, Windows."

**[TERMINAL: Show greenfield start]**

```bash
mkdir my-app && cd my-app
specweave init .
```

> "Step two: initialize. For a new project, just create a folder and init."

```
"Build a simple todo app with React"
```

> "Step three: describe what you want naturally. SpecWeave creates the increment for you. Perfect for getting started."

**[TERMINAL: Show explicit command for existing projects]**

> "For existing projects, use explicit commands:"

```bash
/sw:increment "Add user login"
/sw:auto
/sw:done 0001
```

> "Pick a small feature — user login, dark mode toggle, a simple API endpoint. Complete one increment. Feel the workflow."

**[Point to first project recommendations]**

> "For your first project, I recommend:
>
> - Something small — 5-10 tasks maximum
> - Something you understand — don't learn a new framework AND SpecWeave together
> - Something testable — features with clear acceptance criteria
>
> A todo app? Perfect. A settings page? Great. A full e-commerce site? Save that for increment two."

**[SCREEN: Show community links]**

> "Resources to help you:
>
> - **Documentation**: spec-weave.com — everything we covered today and more
> - **Discord**: Link in description — ask questions, share wins, get help
> - **GitHub**: Star the repo, report issues, contribute
> - **Academy**: 16 lessons from beginner to expert"

**[Point to staying updated resources]**

> "AI tooling moves FAST. Claude Code ships updates constantly. Here's how I stay on top of it — and you should too:
>
> **Three resources I check daily:**
>
> - **Boris Cherny's Twitter**: https://x.com/bcherny — Boris is the creator of Claude Code at Anthropic. I follow him to learn about new features before they even hit the changelog.
>
> - **The Claude Code changelog**: github.com/anthropics/claude-code/blob/main/CHANGELOG.md — This is the source of truth. I read this daily to understand what's new, what's changed, what's deprecated.
>
> - **The Anthropic Engineering blog**: anthropic.com/engineering — New articles are rare, but when they drop, they're gold. Deep dives into how Claude works, straight from the team.
>
> Bookmark these. Check them regularly. The AI landscape changes weekly."

**[EXCALIDRAW: Final slide with logo and call to action]**

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│                    SpecWeave                             │
│     Finally. A Spec-Driven AI Framework.                │
│     Legacy. Startup. Enterprise.                        │
│                                                          │
│     100% FREE & OPEN SOURCE                             │
│                                                          │
│    ┌────────────────────────────────────────────┐       │
│    │  3 COMMANDS TO SHIP:                       │       │
│    │                                            │       │
│    │  /sw:increment "Add OAuth"                │       │
│    │  /sw:auto                                  │       │
│    │  /sw:done 0001                            │       │
│    └────────────────────────────────────────────┘       │
│                                                          │
│    140+ self-built features | 0% change failure rate    │
│    136 skills | 68 agents | 53 commands                 │
│                                                          │
│    📖 spec-weave.com                                     │
│    💬 discord.gg/UYg4BGJ65V                              │
│    ⭐ github.com/anton-abyzov/specweave                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

> "Remember: Legacy. Startup. Enterprise. SpecWeave works for all of them.
>
> Three commands to ship. 140+ features built with full traceability. Zero change failures.
>
> Every AI conversation you have is knowledge. Every decision, every correction, every architectural choice. Without a system, that knowledge disappears. With SpecWeave, it becomes permanent.
>
> Stop vibe coding. Start spec-driven development.
>
> **100% free. 100% open source. Forever.**
>
> Install SpecWeave today. Build your first increment. See the difference.
>
> I'm Anton Abyzov. Thanks for watching. Star the repo, join the Discord, and let me know what you build."

---

## SECTION 19: REAL-WORLD SHOWCASE - APPS BUILT WITH SPECWEAVE (63:30 - 71:30)

**[SCREEN: Intro slide]**

> "Okay, we've covered the entire SpecWeave framework. Now let me show you exactly what you can build with it.
>
> Earlier I mentioned five production apps shipped in the past month. Let me walk you through each one — not just showing the UI, but the architecture, the key decisions, and how SpecWeave organized the complexity.
>
> Feel free to skip ahead if you want to jump straight to installation. But if you want to see real applications built entirely with spec-driven development, stick around."

---

### SkillUp - Football Coaching Monetization Platform (64:00 - 66:00)

**[SCREEN: Share screen showing SkillUp mobile app]**

> "Let's start with SkillUp. This is a platform for football coaches to monetize their training programs."

**[Navigate through the app: Instagram-like feed → lesson details → coach dashboard]**

> "The core features:
>
> **Mobile-first feed** — Like Instagram, but for football training content. Coaches post drills, techniques, training sessions.
>
> **Monetization** — Stripe integration lets coaches earn from their programs. I built a custom dashboard showing their revenue, student enrollments, popular content.
>
> **Lesson management** — Coaches configure online and offline sessions. Students book and pay through the platform.
>
> **Programs & Challenges** — Multi-week training programs. Daily challenges. Progress tracking.
>
> **Content scrapers** — Automated scrapers find great free content from YouTube channels. Coaches can reference or incorporate it."

**[SCREEN: Show web dashboard with Stripe revenue charts]**

> "Here's the coach dashboard. Real-time revenue tracking. Student analytics. Content performance metrics.
>
> The tech stack: Remix on Cloudflare Workers for the web app. React Native for mobile. Supabase for database and auth. Stripe for payments. The mobile app has both iOS and Android builds.
>
> My 10-year-old daughter helped test features and gave product feedback. That's the power of clear specs — even a kid can understand what a feature should do."

**[Point to architecture decision]**

> "Key SpecWeave win: The Stripe webhook handling was complex — subscription lifecycle, failed payments, refunds. I documented every edge case in the spec. Six months from now, when I need to add a new subscription tier, I'll read increment 0034 and know exactly how the system works."

---

### EduFeed - Collaborative AI Learning Platform (66:00 - 67:30)

**[SCREEN: Show EduFeed interface]**

> "Next is EduFeed — think NotebookLM meets Zoom for education."

**[Navigate: Content creation → AI generation → video room]**

> "Here's how it works:
>
> **Multi-source content ingestion** — Upload a YouTube video, a PDF textbook, or paste URLs. The AI processes everything.
>
> **Six output formats** — From that source material, EduFeed generates:
> - Video summaries
> - Audio podcast-style discussions
> - Interactive quizzes
> - Flashcard decks
> - Mind maps
> - Study guides
>
> **Collaborative rooms** — Students join video/audio-enabled rooms like Zoom. But here's the twist — they can share the AI-generated materials in real-time. Someone finds a great quiz? Share it with the room. Everyone upvotes the best materials."

**[SCREEN: Show a video room in action with shared materials sidebar]**

> "Look at this — live video chat on the left, shared study materials on the right. Students upvote what helps them most. The AI learns which formats work best for different topics.
>
> Tech stack: Next.js on Vercel for the web app. Supabase for database. OpenAI and Anthropic APIs for content generation. WebRTC for video rooms.
>
> My 14-year-old daughter contributed to this one — testing the student experience, suggesting UI improvements.
>
> SpecWeave advantage: The content generation pipeline has 12 steps — extract, chunk, analyze, generate, format, store. Each step documented in plan.md with failure modes and retry logic. When generation fails, I know exactly where and why."

---

### WC26 - World Cup 2026 AI Travel Assistant (67:30 - 69:00)

**[SCREEN: Show WC26 app - mobile and web]**

> "WC26 is your ultimate World Cup 2026 companion."

**[Navigate: AI chat → team stats → travel planner]**

> "Four main features:
>
> **AI Travel Planner** — Tell it which games you want to see. It suggests flights, hotels, ticket packages. Integrates with booking APIs.
>
> **Live ticket purchasing** — Buy official World Cup tickets directly through the app.
>
> **Comprehensive stats** — Every team's results, fixtures, standings. Player statistics, personal records, historical performance.
>
> **Venue guides** — Information about every stadium. How to get there, nearby hotels, local tips.
>
> The AI assistant knows everything. Ask 'Which games should I attend in New York?' — it suggests matches, estimates costs, books your trip."

**[SCREEN: Show AI chat answering complex query about team matchups]**

> "Here's the AI analyzing matchup history between Argentina and Brazil, suggesting the best game to attend based on rivalry intensity.
>
> Tech stack: Remix on Cloudflare Workers. D1 for the database (SQLite at the edge). Supabase for user auth. Wrangler for deployment. Mobile app built with React Native.
>
> SpecWeave lesson: This app has three distinct domains — travel planning, statistics, content. I created separate feature folders in living docs for each domain. When implementing the stats module, I loaded ONLY the sports data context. Clean separation, zero confusion."

---

### Lulla - AI Baby Calming App (69:00 - 70:00)

**[SCREEN: Show Lulla iOS app + Apple Watch companion]**

> "Lulla is personal — built when my youngest wouldn't sleep in the car."

**[Navigate through: sound library → emergency mode → Apple Watch controls]**

> "Here's what it does:
>
> **Sound library** — Curated collection of calming sounds. Lullabies, white noise, nature sounds, instrumental music. All sourced from free public sound libraries.
>
> **Smart playlists** — Like Spotify for baby sleep. The app learns which sounds work best for your child and creates custom queues.
>
> **Emergency cry detection** — This is the magic. Uses an open-source ML model (trained on scientific research) to classify baby cries into three categories: tired, hungry, or in pain. When it detects crying, it automatically adjusts the playlist to match the need.
>
> **Apple Watch integration** — Control playback from your wrist while driving. See cry classification in real-time.
>
> **Offline-first** — Download your favorite sounds. Works with no internet connection. Files stored in Cloudflare R2."

**[SCREEN: Show emergency mode detecting a cry and adjusting playlist]**

> "Look at this — cry detected, classified as 'tired,' playlist switches to deeper sleep sounds with slower tempo.
>
> Tech stack: Pure Swift for iOS. SwiftUI for the interface. Core ML for the cry classification model. Cloudflare R2 for sound file storage. WatchOS app for Apple Watch.
>
> This is the only app NOT using Remix or React — proves SpecWeave works for native development too.
>
> SpecWeave insight: The ML model integration required careful testing. I documented every classification edge case in the spec. Ambient car noise? Handled. Sibling talking? Filtered out. All captured in increment 0021."

---

### EasyChamp - Enterprise Sports League Platform (70:00 - 71:30)

**[SCREEN: Show EasyChamp platform - league dashboard, match analytics, website builder]**

> "Finally, EasyChamp — this is the big one. Four years in production. Not a month project — an enterprise platform."

**[Navigate: Tournament bracket → live match stats → custom website builder]**

> "EasyChamp is an AI-powered sports league management platform. Here's what makes it complex:
>
> **Tournament systems** — Group stages, knockout brackets, double elimination, round-robin. Fully automated scheduling and standings.
>
> **Live match statistics** — Real-time stat tracking for multiple sports. For football: possession, shots, fouls, cards, substitutions. Each sport has custom stat types.
>
> **ML video analytics** — Upload match video, the system uses computer vision (DETR model) to analyze play. Automatically tracks player movements, ball possession, key events.
>
> **Custom websites** — Every league gets a subdomain. Visual website builder with templates. Fully customizable branding.
>
> **Monetization marketplace** — Tournament organizers charge entry fees through Stripe. Players pay to join. Organizers earn.
>
> **Player data integration** — Scrapers pull player stats from FIFA (now EA Sports FC) and Konami's eFootball. Import complete player databases with ratings and attributes."

**[SCREEN: Show Kubernetes lens dashboard with microservices]**

> "The architecture is serious:
>
> **20+ microservices** — Each domain has its own service. Tournament service, statistics service, video analytics service, user service, payment service.
>
> **GCP deployment** — Running on Google Cloud Platform with ArgoCD for GitOps continuous deployment.
>
> **ML pipelines** — Video processing happens in separate GPU-enabled workers. Model training and deployment automated.
>
> **Custom NPM packages** — Shared UI component library. Shared types across services.
>
> **Infrastructure as Code** — Terraform manages the entire cloud setup."

**[SCREEN: Show ArgoCD dashboard with deployment pipeline]**

> "Look at this — ArgoCD GitOps. Push to main, automatic deployment across all microservices. Health checks, rollback on failure, zero-downtime deployments.
>
> Tech stack: Next.js frontends. Node.js backends. PostgreSQL databases. Redis caching. Kafka for event streaming. TensorFlow for ML models. All deployed on GCP with Kubernetes.
>
> SpecWeave transformation: I introduced SpecWeave to this project six months ago. Before that, architecture decisions lived in Slack threads and Google Docs. Now we have 48 ADRs documenting every major choice. New developers onboard by reading living docs. Compliance audits are trivial — we show the increment trail."

**[SCREEN: Back to your face]**

> "Five apps. Different domains, different stacks, different complexity levels. All built with the same framework — SpecWeave.
>
> The mobile apps prove it works for React Native and native Swift. The enterprise platform proves it scales to 20+ microservices. The ML integration proves it handles complex pipelines.
>
> Every one of these apps has complete documentation. Architecture decisions captured in ADRs. Requirements traced to code through AC-IDs. Tests embedded in tasks.
>
> That's what spec-driven development gives you. Not just code — context, clarity, and confidence."

---

## VIDEO PRODUCTION NOTES

### Excalidraw Diagrams Needed

1. **Intro transition**: "Vibe Coding" crossed out → "Spec-Driven Development" (0:00)
2. **Claude Code Architecture**: Four pillars diagram - Plugins, Skills, Agents, Marketplace, Hooks, CLI>MCP (4:30)
3. **CLI vs MCP comparison**: Side-by-side advantages/disadvantages table (6:00)
4. **Three-file foundation**: spec.md, plan.md, tasks.md with AC-ID arrows connecting them (10:30)
5. **Deployment comparison**: Vercel vs Cloudflare side-by-side with key metrics (35:30)
6. **Cloudflare ecosystem**: Workers + D1 + KV + R2 at the edge (36:00)
7. **Auto mode flow**: Pick → Execute → Test → Pass? → Mark Complete loop (38:30)
8. **Bidirectional sync**: SpecWeave ↔ GitHub/JIRA two-way arrows (47:30)
9. **DORA metrics**: Four quadrant diagram with Elite tier thresholds (55:30)
10. **Outro slide**: SpecWeave logo + links (spec-weave.com, Discord, YouTube, GitHub) (61:30)

### Mermaid Diagrams (Already in docs - no work needed)

- Workflow flowchart (intro.md)
- Phase-by-phase workflow (workflows/overview.md)
- Increment lifecycle state diagram (core-concepts/what-is-an-increment.md)
- Brownfield challenge diagram (workflows/brownfield.md)
- Three-file structure diagram (lessons/02-three-file-structure.md)
- Deployment decision flowchart (guides/deployment-platforms.md)
- Deployment flow sequence diagram (guides/deployment-platforms.md)
- Cloudflare serverless ecosystem diagram (guides/deployment-platforms.md)

### Screen Recording Checklist

| Timestamp | Page to Show | Key Action |
|-----------|--------------|------------|
| 0:00 | lessons/11-vibe-coding-problem | Read pain points |
| 2:30 | intro.md | Show workflow diagram |
| 4:30 | overview/philosophy | Scroll through principles |
| 7:00 | lessons/02-three-file-structure | Show examples |
| 10:00 | core-concepts/what-is-an-increment | Explain lifecycle |
| 12:30 | getting-started/quickstart | Terminal demo |
| 16:00 | core-concepts/who-benefits-from-living-docs | Living docs for AI |
| 17:30 | workflows/overview | Show complete workflow |
| 19:30 | intro.md (external tools) | Show sync table |
| 21:30 | workflows/brownfield | Show brownfield approach |
| 23:30 | lessons/05-quality-gates | Explain gates |
| 25:30 | lessons/index | Show learning paths |
| 27:30 | overview/dogfooding | Show real metrics + Boris Cherny example |
| 30:00 | guides/deployment-platforms | Vercel vs Cloudflare comparison |
| 31:00 | guides/deployment-platforms | Cloudflare serverless ecosystem (D1, R2, KV) |
| 35:00 | guides/autonomous-mode | Auto mode deep dive |
| 40:00 | guides/multi-repo-projects | Multi-repo coordination |
| 44:00 | workflows/github-sync | External sync demo |
| 47:00 | Mobile app increment example | React Native with SpecWeave |
| 52:00 | .specweave/increments/ | Live dogfooding demo |
| 55:00 | reference/hooks | Advanced features overview |
| 58:00 | intro.md | Final recap and call to action |

### Terminal Commands to Demo

```bash
# New Project (Greenfield)
npm install -g specweave
mkdir my-app && cd my-app
specweave init .
# Then describe: "Build a calculator app with React"

# Existing Project
cd your-project
specweave init .
/sw:increment "Add dark mode toggle"
/sw:auto                               # Or /sw:do for step-by-step
/sw:done 0001
/sw:next

# Living docs context
/sw:context authentication   # Load relevant docs
grep -ril "auth" .specweave/docs/internal/  # Search docs

# External sync
/sw:sync-progress
/sw:sync-monitor

# Brownfield
/sw:discrepancies
/sw:import-docs ~/notion --source=notion

# TDD
/sw:tdd-cycle

# Deployment
vercel                           # Deploy to Vercel
wrangler deploy                  # Deploy to Cloudflare Workers
wrangler pages deploy dist       # Deploy to Cloudflare Pages

# Auto mode
/sw:auto                         # Start autonomous execution
/sw:auto-status                  # Check progress

# External sync
/sw-github:sync 0001             # Sync to GitHub
/sw-jira:sync 0001               # Sync to JIRA
/sw:sync-monitor                 # Monitor sync status

# Self-learning
/sw:reflect                      # Analyze session learnings
/sw:reflect-on                   # Enable auto-learning
/sw:reflect-status               # Check memory status

# Multi-repo
ls .specweave/increments/        # List all increments
cat .specweave/increments/0089-github-sync/spec.md  # View increment
```

### Timestamps for YouTube Description

```
0:00 - The Vibe Coding Problem
1:30 - Quick Preview: 5 Production Apps Built in a Month (100x faster)
2:30 - What is SpecWeave? (3 Commands to Ship, Legacy/Startup/Enterprise)
4:30 - THE CLAUDE CODE FOUNDATION (136 Skills, 68 Agents, 53 Commands, 24 Plugins)
8:00 - Core Philosophy (8 Principles)
10:30 - Why Not BMAD or SpecKit? (4 Key Differences)
12:00 - The Three-File Structure (spec.md, plan.md, tasks.md)
14:30 - What is an Increment?
17:00 - Installation & Your First Feature
20:30 - Living Docs for AI Context (Progressive Disclosure)
22:00 - The Complete Workflow
24:00 - External Tool Sync (GitHub, JIRA, ADO)
26:00 - Working with Existing Codebases (Brownfield)
28:00 - Quality Gates & TDD (60%+ Test Coverage)
30:00 - The Learning Path (16 Lessons)
32:00 - Dogfooding: Real Metrics (186K LOC, 0% failures, AI automation era)
34:30 - Self-Improving Skills (Reflect)
36:30 - Deployment Platforms (Vercel vs Cloudflare)
39:30 - Autonomous Mode Deep Dive (/sw:auto)
44:30 - Multi-Repo Coordination
48:30 - External Sync Deep Dive (GitHub, JIRA)
51:30 - Real Mobile App Example (React Native + Expo)
56:30 - Self-Dogfooding & DORA Metrics
59:30 - Advanced Features (Hooks, Skills, Reflect)
62:30 - Getting Started & Next Steps
64:30 - REAL-WORLD SHOWCASE: Apps Built with SpecWeave
65:00 - SkillUp: Football Coaching Monetization Platform
67:00 - EduFeed: Collaborative AI Learning Platform
68:30 - WC26: World Cup 2026 AI Travel Assistant
70:00 - Lulla: AI Baby Calming App (Swift + ML)
71:00 - EasyChamp: Enterprise Sports League Platform (20+ Microservices)
```

### YouTube Description Template

```
SpecWeave: Finally. A Spec-Driven AI Framework. | 100% Free & Open Source

Legacy. Startup. Enterprise. — Drop it into a 10-year-old codebase, use it on your weekend MVP, or scale it to 50 teams. 3 commands to ship. 140+ self-built features. 0% change failure rate.

In this 71-minute comprehensive tutorial, I walk through the complete spec-weave.com
documentation, showing you how to go from "vibe coding" to spec-driven development.
Includes deep dive into Claude Code's architecture (plugins, skills, agents, marketplace)
and a detailed showcase of 5 production apps built in ONE MONTH — 100x faster than before.

🎯 THE 3-COMMAND WORKFLOW:
/sw:increment "Add OAuth" → Creates spec.md + plan.md + tasks.md
/sw:auto → Autonomous execution for HOURS
/sw:done 0001 → Quality gates: tasks ✓ tests 60%+ ✓ docs ✓

What you'll learn:
- Why AI coding tools fail (the vibe coding problem)
- **Why Not BMAD or SpecKit?** - Full lifecycle vs single-use generation
- **Claude Code Foundation** - 136 Skills, 68 Agents, 53 Commands, 24 Plugins
- **CLI vs MCP** - Why direct CLI usage often beats MCP servers
- The three-file structure: spec.md, plan.md, tasks.md
- What increments are and how they preserve context
- Live demo: building your first feature
- Living docs as AI context (progressive disclosure, not RAG)
- External tool sync (GitHub, JIRA, Azure DevOps) - bidirectional
- Working with existing codebases (brownfield) - even 10-year legacy
- Quality gates and TDD workflow (60%+ test coverage enforced)
- Autonomous mode (/sw:auto) with visual status labels
- Multi-repo coordination for complex projects
- Building mobile apps with React Native + Expo
- Self-improving skills with the Reflect system
- Deployment platforms: Vercel vs Cloudflare
- The complete 16-lesson learning path
- Real metrics from building SpecWeave with SpecWeave
- **100x productivity increase** - From year-long projects to one month

BONUS SECTION (63:30-71:30): Real-World App Showcase
See the actual apps built with SpecWeave:
- SkillUp: Football coaching platform with Stripe monetization
- EduFeed: NotebookLM-style AI learning with collaborative video rooms
- WC26: World Cup 2026 AI travel assistant
- Lulla: ML-powered baby calming app (Swift + Apple Watch)
- EasyChamp: Enterprise sports platform (20+ microservices, K8s, ML pipelines)

Links:
- Documentation: https://spec-weave.com
- GitHub: https://github.com/anton-abyzov/specweave
- Discord: https://discord.gg/UYg4BGJ65V
- Install: npm install -g specweave

Dogfooding stats:
- 186,719 lines of code
- 150+ increments built with SpecWeave (and counting!)
- 74 Architecture Decision Records
- 100 deploys/month (Elite DORA tier)
- 0% failure rate across 65 releases
- 5+ production applications built in 1 month

This isn't a demo framework — it's production-tested on itself and real businesses.

#ai #coding #developer #programming #typescript #nodejs #claude #specweave #autonomous #reactnative #stripe #cloudflare
```

### Key Topics Covered

| Topic | Section | Page Referenced |
|-------|---------|-----------------|
| Vibe Coding Problem | 0:00 | lessons/11-vibe-coding-problem |
| Quick Preview (5 Apps + 100x Story) | 1:30 | Real production apps showcase |
| What is SpecWeave | 2:30 | intro.md |
| **Claude Code Foundation** | **4:30** | **Plugins, Skills, Agents, Marketplace, Hooks, CLI vs MCP** |
| Philosophy & Principles | 8:00 | overview/philosophy |
| Three-File Structure | 10:30 | lessons/02-three-file-structure |
| What is an Increment | 13:30 | core-concepts/what-is-an-increment |
| Quick Start | 16:00 | getting-started/quickstart |
| Living Docs for AI | 19:30 | core-concepts/who-benefits-from-living-docs |
| Complete Workflow | 21:00 | workflows/overview |
| External Tool Sync | 23:00 | lessons/07-external-tools |
| Brownfield Projects | 25:00 | workflows/brownfield |
| Quality Gates | 27:00 | lessons/05-quality-gates |
| TDD Workflow | 27:00 | lessons/06-tdd-workflow |
| Learning Path | 29:00 | lessons/index |
| Dogfooding | 31:00 | overview/dogfooding |
| Self-Improving Skills | 33:30 | guides/self-improving-skills |
| Deployment Platforms | 35:30 | guides/deployment-platforms |
| Autonomous Mode | 38:30 | guides/autonomous-mode |
| Multi-Repo Coordination | 43:30 | guides/multi-repo-projects |
| External Sync Deep Dive | 47:30 | workflows/github-sync |
| Mobile App Development | 50:30 | Mobile app increment example |
| DORA Metrics | 55:30 | overview/dogfooding |
| Advanced Features | 58:30 | reference/hooks |
| **Real-World Showcase** | **63:30** | **Live app demonstrations** |
| SkillUp Platform | 64:00 | Football coaching + Stripe |
| EduFeed Platform | 66:00 | AI learning + video rooms |
| WC26 Platform | 67:30 | World Cup 2026 assistant |
| Lulla App | 69:00 | iOS + ML baby calming |
| EasyChamp Platform | 70:00 | Enterprise + 20 microservices |

### Brief Mentions (Not Deep Dives)

These topics are mentioned briefly but have full documentation available:

- **16 Expert Lessons** (lessons/01-16)
- **Full Academy** (14 parts, 44 modules)
- **Multi-project mode** (covered in advanced patterns)
- **Cost optimization** (covered in advanced patterns)
- **AI model selection** (lesson 8)
- **Troubleshooting** (lesson 9)
- **Compliance** (reference/compliance-standards)
