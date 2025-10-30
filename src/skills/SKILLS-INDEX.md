# SpecWeave Skills Index

**Purpose**: Quick reference for all available skills. Read this file BEFORE starting any task.

**Last Updated**: 2025-10-30T18:08:45.324Z (auto-generated, do not edit manually)

**Total Skills**: 34

---

## 🚀 Quick Start (Progressive Disclosure)

**MANDATORY**: Skills are your expert manuals. Always check for relevant skills BEFORE starting implementation.

### Progressive Disclosure Pattern

1. **Scan this index** to find skills matching your task
2. **Match activation keywords** to your current request
3. **Load full SKILL.md** for matching skills
4. **Follow the workflow** in SKILL.md precisely

### Example Workflow

```
User asks: "Plan a new feature for user authentication"

Step 1: Scan this index → Find "increment-planner" skill
Step 2: Check keywords → Matches "feature planning", "create increment"
Step 3: Load skill → cat .claude/skills/increment-planner/SKILL.md
Step 4: Execute → Follow the increment planning workflow
```

---

## 📚 All Available Skills


### Framework Core

#### context-loader

**Description**: Explains how SpecWeave achieves context efficiency through Claude's native progressive disclosure mechanism and sub-agent parallelization. Skills load only when relevant, sub-agents isolate context. Activates when users ask about context loading, token usage, or how SpecWeave scales. Keywords: context loading, progressive disclosure, token efficiency, sub-agents, context management.

**Location**: `.claude/skills/context-loader/SKILL.md`

---

#### context-optimizer

**Description**: Second-pass context optimization that analyzes user prompts and removes irrelevant specs, agents, and skills from loaded context. Achieves 80%+ token reduction through smart cleanup. Activates for optimize context, reduce tokens, clean context, smart context, precision loading.

**Location**: `.claude/skills/context-optimizer/SKILL.md`

**Allowed tools**: Read, Grep, Glob

---

#### increment-planner

**Description**: Creates comprehensive implementation plans for SpecWeave increments (aka features - both terms are interchangeable). This skill should be used when planning new increments/features, creating specifications, or organizing implementation work. Activates for: increment planning, feature planning, implementation plan, create increment, create feature, plan increment, plan feature, organize work, break down increment, break down feature.

**Activates for**: increment planning, feature planning, implementation plan, create increment, create feature, plan increment, plan feature, organize work, break down increment, break down feature

**Location**: `.claude/skills/increment-planner/SKILL.md`

---

#### increment-quality-judge

**Description**: Optional AI-powered quality assessment for specifications, plans, and tests. Goes beyond rule-based validation to evaluate clarity, testability, edge cases, and architecture soundness. Activates for validate quality, quality check, assess spec, evaluate increment, spec review, quality score.

**Location**: `.claude/skills/increment-quality-judge/SKILL.md`

**Allowed tools**: Read, Grep, Glob

---

#### skill-creator

**Description**: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.

**Location**: `.claude/skills/skill-creator/SKILL.md`

---

#### specweave-ado-mapper

**Description**: Expert in bidirectional conversion between SpecWeave increments and Azure DevOps (ADO) Epics/Features/User Stories/Tasks. Handles export (increment → ADO), import (ADO → increment), and bidirectional sync with conflict resolution. Activates for ADO sync, Azure DevOps sync, work item creation, import from ADO.

**Location**: `.claude/skills/specweave-ado-mapper/SKILL.md`

---

#### specweave-detector

**Description**: Documentation skill that explains SpecWeave v0.1.9 smart workflow slash commands. SpecWeave uses EXPLICIT slash commands only - no auto-activation! Use /inc (Plan Increment) or /increment to start. Smart features auto-resume (/do), auto-close (/inc), progress tracking (/progress). Commands /inc, /do, /progress, /validate, /done, /list-increments, /sync-docs, /sync-github. All commands listed in .claude/commands/. Keywords slash commands, /inc, /increment, /do, /progress, /validate, /done, specweave commands, smart workflow, v0.1.9.

**Location**: `.claude/skills/specweave-detector/SKILL.md`

---

#### specweave-jira-mapper

**Description**: Expert in bidirectional conversion between SpecWeave increments and JIRA epics/stories/subtasks. Handles export (increment → JIRA), import (JIRA → increment), and bidirectional sync with conflict resolution. Activates for JIRA sync, issue creation, import from JIRA.

**Location**: `.claude/skills/specweave-jira-mapper/SKILL.md`

---


### Orchestration & Planning

#### role-orchestrator

**Description**: Multi-agent orchestration system that coordinates specialized agents (PM, Architect, DevOps, QA, Tech Lead, Security) to work together on complex tasks. Implements hierarchical orchestrator-worker pattern. Activates for complex multi-step requests requiring multiple roles/skills. Keywords: build product, create SaaS, full implementation, end-to-end, multi-agent, orchestrate, coordinate roles, complex project.

**Location**: `.claude/skills/role-orchestrator/SKILL.md`

---

#### skill-router

**Description**: Intelligent routing system that parses ambiguous user requests and routes them to appropriate SpecWeave skills with >90% accuracy. Acts as the "traffic controller" for all skill invocations. Activates when user intent is unclear or when multiple skills could handle a request. Keywords: route, clarify, ambiguous, which skill, help me decide.

**Location**: `.claude/skills/skill-router/SKILL.md`

---


### External Integrations

#### ado-sync

**Description**: Sync SpecWeave increments with Azure DevOps Epics/Features/User Stories. Activates for ADO sync, Azure DevOps sync, create ADO work item, import from ADO. Coordinates with specweave-ado-mapper agent.

**Location**: `.claude/skills/ado-sync/SKILL.md`

**Allowed tools**: Read, Write, Edit, Task, Bash

---

#### figma-mcp-connector

**Description**: Connects to Figma MCP servers (official and community) to read/write Figma files, extract design tokens, and manage design resources. Wrapper for both official Figma MCP (desktop/remote) and community Framelink MCP. Activates for figma file, figma api, figma mcp, read figma, figma data, figma variables.

**Location**: `.claude/skills/figma-mcp-connector/SKILL.md`

---

#### github-sync

**Description**: Bi-directional synchronization between GitHub and SpecWeave. Maps GitHub Milestones to Release Plans, Issues to RFCs/Tasks. Maintains sync status. Activates for GitHub, sync GitHub, map GitHub to SpecWeave, GitHub issues.

**Location**: `.claude/skills/github-sync/SKILL.md`

---

#### jira-sync

**Description**: Sync SpecWeave increments with JIRA epics/stories. Activates for JIRA sync, create JIRA issue, import from JIRA, sync to JIRA. Coordinates with specweave-jira-mapper agent.

**Location**: `.claude/skills/jira-sync/SKILL.md`

**Allowed tools**: Read, Write, Edit, Task, Bash

---


### Architecture & Design

#### design-system-architect

**Description**: Expert guide for creating design systems using Atomic Design methodology. Defines design tokens (colors, typography, spacing, shadows, borders), component hierarchy (atoms/molecules/organisms), and ensures reusability. Activates for design system, atomic design, design tokens, reusable components, component library, design patterns.

**Location**: `.claude/skills/design-system-architect/SKILL.md`

---

#### diagrams-architect

**Description**: Expert in creating Mermaid diagrams following C4 Model and SpecWeave conventions. Specializes in system architecture, sequence diagrams, ER diagrams, and deployment diagrams. Activates for diagram creation, architecture visualization, data modeling, sequence flows, C4 diagrams, HLD, LLD.

**Location**: `.claude/skills/diagrams-architect/SKILL.md`

---

#### diagrams-generator

**Description**: Generate Mermaid diagrams following C4 conventions. Activates for create diagram, draw diagram, visualize, system diagram, architecture diagram, C4 diagram, context diagram, container diagram, component diagram, sequence diagram, ER diagram, entity relationship, data model, deployment diagram. Coordinates with diagrams-architect agent.

**Location**: `.claude/skills/diagrams-generator/SKILL.md`

**Allowed tools**: Read, Write, Edit, Task

---

#### spec-driven-brainstorming

**Description**: Refines rough ideas into spec-ready designs through structured Socratic questioning, alternative exploration, and incremental validation. Use BEFORE creating increments - transforms vague concepts into clear requirements. Activates for: brainstorm, explore idea, refine concept, design thinking, what should I build, help me think through, ultrathink design, deep thinking, architecture exploration.

**Activates for**: brainstorm, explore idea, refine concept, design thinking, what should I build, help me think through, ultrathink design, deep thinking, architecture exploration

**Location**: `.claude/skills/spec-driven-brainstorming/SKILL.md`

---


### Development

#### dotnet-backend

**Description**: .NET/C# backend developer for ASP.NET Core APIs with Entity Framework Core. Builds REST APIs, minimal APIs, gRPC services, authentication with Identity/JWT, authorization, database operations, background services, SignalR real-time features. Activates for: .NET, C#, ASP.NET Core, Entity Framework Core, EF Core, .NET Core, minimal API, Web API, gRPC, authentication .NET, Identity, JWT .NET, authorization, LINQ, async/await C#, background service, IHostedService, SignalR, SQL Server, PostgreSQL .NET, dependency injection, middleware .NET.

**Activates for**: .NET, C#, ASP

**Location**: `.claude/skills/dotnet-backend/SKILL.md`

---

#### figma-implementer

**Description**: Expert frontend developer specializing in converting Figma designs to production-ready React/Angular components with Storybook validation. Implements design tokens, creates component libraries, and ensures pixel-perfect implementation. Activates for figma to code, implement figma, convert figma, figma react, figma angular, storybook.

**Location**: `.claude/skills/figma-implementer/SKILL.md`

---

#### figma-to-code

**Description**: Converts Figma designs to production-ready code (React/Angular). Generates design tokens, components, and TypeScript interfaces from Figma files. Parses component hierarchy, maps properties to props, generates TypeScript types. Activates for figma to code, convert figma to react, figma to angular, implement design, code generation.

**Location**: `.claude/skills/figma-to-code/SKILL.md`

---

#### frontend

**Description**: Frontend developer for React, Vue, Angular web applications. Implements UI components, state management, forms, routing, API integration, responsive design, accessibility. Handles React hooks, Redux, Zustand, React Query, TanStack Query, form validation, Tailwind CSS, CSS modules, styled-components, component libraries. Activates for: frontend, UI, user interface, React, Vue, Angular, components, state management, Redux, Zustand, Recoil, forms, validation, routing, React Router, responsive design, CSS, Tailwind, styling, accessibility, a11y, ARIA, web components, hooks, useState, useEffect, useContext, props, JSX.

**Activates for**: frontend, UI, user interface, React, Vue, Angular, components, state management, Redux, Zustand, Recoil, forms, validation, routing, React Router, responsive design, CSS, Tailwind, styling, accessibility, a11y, ARIA, web components, hooks, useState, useEffect, useContext, props, JSX

**Location**: `.claude/skills/frontend/SKILL.md`

---

#### nextjs

**Description**: NextJS 14+ implementation specialist. Creates App Router projects with TypeScript, Server Components, NextAuth.js, Prisma ORM, Tailwind CSS, shadcn/ui. Configures production builds, API routes, environment variables. Activates for NextJS, Next.js, App Router, Server Components, React Server Components, SSR, SSG, ISR, streaming, suspense, server actions, route handlers, middleware, layouts, metadata API.

**Location**: `.claude/skills/nextjs/SKILL.md`

**Allowed tools**: Read, Write, Edit, Bash

---

#### nodejs-backend

**Description**: Node.js/TypeScript backend developer. Builds Express.js, Fastify, NestJS APIs with Prisma ORM, TypeORM, Mongoose. Implements REST APIs, GraphQL, authentication (JWT, session, OAuth), authorization, database operations, background jobs, WebSockets, real-time features, API validation, error handling, middleware. Activates for: Node.js, NodeJS, Express, Fastify, NestJS, TypeScript backend, API, REST API, GraphQL, Prisma, TypeORM, Mongoose, MongoDB, PostgreSQL with Node, MySQL with Node, authentication backend, JWT, passport.js, bcrypt, async/await, promises, middleware, error handling, validation, Zod, class-validator, background jobs, Bull, BullMQ, Redis, WebSocket, Socket.io, real-time.

**Activates for**: Node

**Location**: `.claude/skills/nodejs-backend/SKILL.md`

---

#### python-backend

**Description**: Python backend developer for FastAPI, Django, Flask APIs with SQLAlchemy, Django ORM, Pydantic validation. Implements REST APIs, async operations, database integration, authentication, data processing with pandas/numpy, machine learning integration, background tasks with Celery, API documentation with OpenAPI/Swagger. Activates for: Python, Python backend, FastAPI, Django, Flask, SQLAlchemy, Django ORM, Pydantic, async Python, asyncio, uvicorn, REST API Python, authentication Python, pandas, numpy, data processing, machine learning, ML API, Celery, Redis Python, PostgreSQL Python, MongoDB Python, type hints, Python typing.

**Activates for**: Python, Python backend, FastAPI, Django, Flask, SQLAlchemy, Django ORM, Pydantic, async Python, asyncio, uvicorn, REST API Python, authentication Python, pandas, numpy, data processing, machine learning, ML API, Celery, Redis Python, PostgreSQL Python, MongoDB Python, type hints, Python typing

**Location**: `.claude/skills/python-backend/SKILL.md`

---


### Quality & Testing

#### e2e-playwright

**Description**: End-to-end browser automation and testing expert using Playwright. Tests web applications, validates user flows, captures screenshots, checks accessibility, and verifies functionality. SpecWeave-aware for increment testing. Activates for E2E testing, browser automation, web testing, Playwright, UI testing, integration testing, user flow validation, screenshot testing, accessibility testing, headless browser, test web app, browser test, automated testing, web automation, check website, validate UI, test increment.

**Location**: `.claude/skills/e2e-playwright/SKILL.md`

**Allowed tools**: Bash, Read, Write, Glob, Grep

---

#### spec-driven-debugging

**Description**: Use when encountering ANY bug, test failure, or unexpected behavior before proposing fixes - systematic five-phase framework (context loading, root cause investigation, pattern analysis, hypothesis testing, implementation with documentation) that ensures understanding and spec alignment before attempting solutions. Activates for: bug, error, test failure, failing test, unexpected behavior, crash, exception, debug, troubleshoot, fix issue, investigate problem, ultrathink bug.

**Activates for**: bug, error, test failure, failing test, unexpected behavior, crash, exception, debug, troubleshoot, fix issue, investigate problem, ultrathink bug

**Location**: `.claude/skills/spec-driven-debugging/SKILL.md`

---


### Infrastructure

#### cost-optimizer

**Description**: Analyzes infrastructure requirements and recommends the cheapest cloud platform. Compares Hetzner, Vercel, AWS, Railway, Fly.io, DigitalOcean based on users, traffic, storage. Shows cost breakdown and savings. Activates for cheapest, budget, cost-effective, compare platforms, save money, affordable hosting.

**Location**: `.claude/skills/cost-optimizer/SKILL.md`

---

#### hetzner-provisioner

**Description**: Provisions infrastructure on Hetzner Cloud with Terraform/Pulumi. Generates IaC code for CX11/CX21/CX31 instances, managed Postgres, SSL configuration, Docker deployment. Activates for deploy on Hetzner, Hetzner Cloud, budget deployment, cheap hosting, $10/month hosting.

**Location**: `.claude/skills/hetzner-provisioner/SKILL.md`

---


### Documentation

#### brownfield-analyzer

**Description**: Analyzes existing brownfield projects to map documentation structure to SpecWeave's PRD/HLD/RFC/Runbook pattern. Scans folders, classifies documents, detects external tools (Jira, ADO, GitHub), and generates migration plan. Activates for brownfield, existing project, migrate, analyze structure, legacy documentation.

**Location**: `.claude/skills/brownfield-analyzer/SKILL.md`

---

#### figma-designer

**Description**: Expert Figma designer specializing in design systems, atomic design, and UI/UX best practices. Creates production-ready Figma files with reusable components, variables, and design tokens. Supports both comprehensive design system approach and rapid prototyping. Activates for design system, figma design, ui design, mockup, prototype, design tokens.

**Location**: `.claude/skills/figma-designer/SKILL.md`

---


### Other

#### bmad-method-expert

**Description**: BMAD-METHOD Subject Matter Expert for dynamic gap analysis. Deeply understands BMAD framework and performs on-demand comparison analysis against current SpecWeave state. Analyzes actual code, features, and specs to generate fresh comparison reports. Activates for "compare to BMAD", "BMAD vs SpecWeave", "gap analysis", "what does BMAD have", "benefits comparison", "should I use BMAD or SpecWeave", "BMAD features", "how does BMAD handle X".

**Location**: `.claude/skills/bmad-method-expert/SKILL.md`

---

#### brownfield-onboarder

**Description**: Intelligently onboards brownfield projects by merging existing CLAUDE.md backups into SpecWeave structure. Extracts project-specific knowledge, domain context, team conventions, and technical details from backup CLAUDE.md files, then distributes content to appropriate SpecWeave folders without bloating CLAUDE.md. Activates for: merge docs, merge claude, onboard brownfield, import existing docs, claude backup, specweave merge-docs.

**Activates for**: merge docs, merge claude, onboard brownfield, import existing docs, claude backup, specweave merge-docs

**Location**: `.claude/skills/brownfield-onboarder/SKILL.md`

---

#### spec-kit-expert

**Description**: SPEC-KIT Subject Matter Expert for dynamic gap analysis. Deeply understands spec-kit framework and performs on-demand comparison analysis against current SpecWeave state. Analyzes actual code, features, and specs to generate fresh comparison reports. Activates for "compare to spec-kit", "spec-kit vs SpecWeave", "gap analysis", "what does spec-kit have", "benefits comparison", "should I use spec-kit or SpecWeave", "spec-kit features", "how does spec-kit handle X", "GitHub spec-kit".

**Location**: `.claude/skills/spec-kit-expert/SKILL.md`

---


## 💡 How Skills Work

**Level 1 - Discovery (this file)**:
- Scan activation keywords
- Match to your current task
- Identify 1-3 relevant skills

**Level 2 - Deep Dive (SKILL.md)**:
- Load full skill documentation
- Read required prerequisites
- Follow step-by-step workflow

**Level 3 - Execution**:
- Apply skill's instructions
- Use recommended tools
- Follow SpecWeave best practices

---

## 🎯 Task → Skill Matching Guide

| Your Task | Relevant Skill | Keywords |
|-----------|---------------|----------|
| "Plan a new feature" | `increment-planner` | "feature planning", "create increment" |
| "Sync to JIRA" | `jira-sync` | "JIRA sync", "create JIRA issue" |
| "Create diagram" | `diagrams-architect` | "architecture diagram", "C4 diagram" |
| "Build React UI" | `frontend` | "React", "components", "UI" |
| "Deploy to cloud" | `hetzner-provisioner` | "deploy", "infrastructure" |
| "Quality check" | `increment-quality-judge` | "quality check", "assess spec" |
| "E2E testing" | `e2e-playwright` | "E2E test", "browser test" |
| "Generate docs site" | `docusaurus` | "documentation site", "docs" |

---

## ⚡ Why Skills Matter

**Without skills**:
- ❌ Reinvent workflows every session
- ❌ Inconsistent increment structure
- ❌ Miss SpecWeave conventions
- ❌ Waste tokens on irrelevant docs

**With skills**:
- ✅ Proven workflows ready to use
- ✅ Consistent high-quality output
- ✅ SpecWeave best practices enforced
- ✅ Efficient token usage (load only what's needed)

---

## 🔧 For AI Tool Developers

This index simulates Claude Code's native progressive disclosure:
- Claude pre-loads skill metadata at startup (name + description)
- Other tools read this index file for same benefit
- Single file read replaces 34 individual file scans
- Token savings: ~97% (1 file vs 34 files)

**How to use in your AI tool**:
1. Load this file at session start
2. Parse activation keywords
3. Match user requests to keywords
4. Load full SKILL.md when matched
5. Execute skill workflow

---

**Generated by**: `src/utils/generate-skills-index.ts`

**Regenerate with**: `npm run generate-skills-index`
