---
increment: 0225-verified-skill-com
title: "Build & Deploy verified-skill.com"
type: feature
priority: P1
status: planned
created: 2026-02-16
structure: user-stories
test_mode: test-after
coverage_target: 80
---

# Feature: Build & Deploy verified-skill.com

## Overview

Full implementation and deployment of verified-skill.com — the trusted registry for AI agent skills. Built on architecture designs from increment 0217, this delivers: Next.js website on Cloudflare Workers via @opennextjs/cloudflare, Neon PostgreSQL + Prisma database, Cloudflare Workers AI for Tier 2 LLM security scanning, `npx vskill` CLI published to npm, Playwright E2E tests, cron-based skill scanning from 3 default marketplaces (Anthropic/Claude, OpenAI/Codex, Google/Gemini), skill submission with security verification pipeline, admin dashboard, and distinctive UI design.

**Tech Stack**: Next.js 15+ App Router, @opennextjs/cloudflare, Neon PostgreSQL, Prisma (client engine), Cloudflare Workers AI, Turborepo, Tailwind CSS + shadcn/ui, Playwright, SendGrid email, npm package `vskill`

**Domain**: verified-skill.com (already purchased)

## User Stories

### US-001: Project Infrastructure & Deployment (P1)
**Project**: specweave

**As a** platform operator
**I want** the verified-skill.com project deployed to Cloudflare Workers with database connected
**So that** the platform has a production-ready foundation to build features on

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Next.js 15+ App Router initialized in `vskill/packages/web/` with TypeScript
- [ ] **AC-US1-02**: @opennextjs/cloudflare configured with `wrangler.jsonc` and `open-next.config.ts`
- [ ] **AC-US1-03**: Neon PostgreSQL database created and Prisma configured with `@prisma/adapter-neon` (client engine, no Rust binary)
- [ ] **AC-US1-04**: Prisma schema from 0217 migrated to Neon database
- [ ] **AC-US1-05**: Skeleton deploys to Cloudflare Workers and responds at verified-skill.com
- [ ] **AC-US1-06**: Domain connected via Cloudflare DNS with SSL
- [ ] **AC-US1-07**: Turborepo workspace configured for packages/web, packages/cli, packages/scanner, packages/e2e

---

### US-002: REST API & Database Layer (P1)
**Project**: specweave

**As a** frontend developer and CLI user
**I want** a complete REST API for skills, submissions, and badges
**So that** all clients can interact with the platform programmatically

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Per-request Prisma client factory using `PrismaNeon` adapter (Workers-compatible)
- [ ] **AC-US2-02**: `GET /api/v1/skills` returns paginated skill list with filters (category, tier, agent, search)
- [ ] **AC-US2-03**: `GET /api/v1/skills/[name]` returns skill detail with versions, agents, popularity, scan results
- [ ] **AC-US2-04**: `GET /api/v1/skills/[name]/badge` returns cached SVG badge with verification tier
- [ ] **AC-US2-05**: `POST /api/v1/submissions` accepts GitHub repo URL, skill name, optional email
- [ ] **AC-US2-06**: `GET /api/v1/submissions/[id]` returns submission status with state timeline
- [ ] **AC-US2-07**: All API routes have request validation and proper error responses

---

### US-003: Security Scanner & Verification Pipeline (P1)
**Project**: specweave

**As a** skill submitter
**I want** my skill automatically scanned through a multi-tier verification pipeline
**So that** it receives a trust badge based on thorough security analysis

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Tier 1 scanner ported from `security-scanner.ts` (37 patterns) to `@vskill/scanner` package, scanning full repository (SKILL.md + scripts/, hooks/, configs) via shallow clone
- [ ] **AC-US3-02**: Tier 2 LLM scanning via Cloudflare Workers AI (`@cf/meta/llama-3.1-70b-instruct`) with security judge prompt
- [ ] **AC-US3-03**: Submission state machine: RECEIVED → TIER1_SCANNING → TIER2_SCANNING → AUTO_APPROVED/NEEDS_REVIEW → PUBLISHED
- [ ] **AC-US3-04**: Cloudflare Queues for async pipeline processing (scan-pipeline queue + dead letter queue)
- [ ] **AC-US3-05**: Auto-approve logic: Tier 1 PASS + Tier 2 score >= 80 → PUBLISHED
- [ ] **AC-US3-06**: Vendor auto-verification: anthropics/, openai/, google-gemini/ → skip scan → AUTO_APPROVED
- [ ] **AC-US3-07**: Every state transition logged in audit trail (SubmissionStateEvent)
- [ ] **AC-US3-08**: Tier 2 scoring: 0-100 scale, verdict PASS/CONCERNS/FAIL
- [ ] **AC-US3-09**: Shallow clone (depth=1) of submitted repo with temp directory cleanup
- [ ] **AC-US3-10**: All non-binary files in skill directory scanned (scripts/, hooks/, .json, .yaml), not just SKILL.md
- [ ] **AC-US3-11**: Individual file size limit (100KB) and total scan payload limit (1MB) enforced
- [ ] **AC-US3-12**: Files referenced in SKILL.md content detected and included in scan scope

---

### US-004: Pre-Verified Skill Seeding (P1)
**Project**: specweave

**As a** first-time visitor
**I want** to see verified skills from major platforms already listed
**So that** the platform feels alive and trustworthy from day one

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Skills from `anthropics/skills` (Claude) imported and auto-verified
- [ ] **AC-US4-02**: Skills from `openai/codex-universal` (Codex/OpenAI) imported and auto-verified
- [ ] **AC-US4-03**: Skills from `google-gemini/skills` (Gemini) imported and auto-verified
- [ ] **AC-US4-04**: Each imported skill published with v1.0.0 and vendor `verified` badge
- [ ] **AC-US4-05**: Seed script is idempotent (re-running doesn't duplicate)

---

### US-005: Website Landing Page & Skill Browsing (P1)
**Project**: specweave

**As a** developer discovering the platform
**I want** a distinctive, polished website where I can browse and search verified skills
**So that** I can find trustworthy skills for my AI agents

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Landing page with hero "The Trusted Registry for AI Agent Skills", onboarding steps, trending skills
- [ ] **AC-US5-02**: `/skills` page with searchable listing, filters (category, tier, popularity, agent), pagination
- [ ] **AC-US5-03**: `/skills/[name]` detail page with versions, scan results, agents, badge embed code
- [ ] **AC-US5-04**: `/agents` page showing all 39 agents in card/grid layout with universal/non-universal badges
- [ ] **AC-US5-05**: Distinctive design: verification green + deep navy palette, clean typography, NOT default dark theme
- [ ] **AC-US5-06**: Fully responsive (mobile-first) and accessible (WCAG 2.1 AA)
- [ ] **AC-US5-07**: Agent compatibility showcase on landing page showing 39 supported agents

---

### US-006: Skill Submission Flow (P1)
**Project**: specweave

**As a** skill author
**I want** to submit my skill for verification through a web form
**So that** my skill gets a trust badge and reaches a wider audience

**Acceptance Criteria**:
- [ ] **AC-US6-01**: `/submit` page with form: GitHub repo URL, skill name, optional email
- [ ] **AC-US6-02**: `/submit/[id]` status tracker with real-time state timeline
- [ ] **AC-US6-03**: Form validation prevents invalid GitHub URLs and empty skill names
- [ ] **AC-US6-04**: Submission triggers verification pipeline immediately
- [ ] **AC-US6-05**: Status page shows scan progress, findings, and final verdict

---

### US-007: Admin Dashboard (P1)
**Project**: specweave

**As a** platform admin
**I want** a dashboard to manage submissions and monitor platform health
**So that** I can review flagged submissions, approve/reject skills, and track metrics

**Acceptance Criteria**:
- [ ] **AC-US7-01**: JWT email/password login with bcrypt, 24h access / 7d refresh tokens
- [ ] **AC-US7-02**: Role-based access: super_admin (full), reviewer (approve/reject only)
- [ ] **AC-US7-03**: Submission queue with status filters (pending, needs-review, approved, rejected)
- [ ] **AC-US7-04**: Approve/reject/escalate actions with reason text
- [ ] **AC-US7-05**: Scan results display per submission (Tier 1 findings, Tier 2 score/verdict)
- [ ] **AC-US7-06**: Platform stats: total skills, approval rate, scan metrics
- [ ] **AC-US7-07**: Admin seeding CLI command for initial admin creation
- [ ] **AC-US7-08**: All admin actions logged in audit trail

---

### US-008: CLI — npx vskill (P1)
**Project**: specweave

**As a** developer installing AI skills
**I want** a CLI that scans skills before installing and works across all agent platforms
**So that** I never install a malicious skill unknowingly

**Acceptance Criteria**:
- [ ] **AC-US8-01**: `vskill add <owner/repo>` installs skill after security scan
- [ ] **AC-US8-02**: `vskill scan <source>` scans without installing
- [ ] **AC-US8-03**: `vskill list` shows installed skills with verification status
- [ ] **AC-US8-04**: `vskill submit <source>` submits skill for verification on verified-skill.com
- [ ] **AC-US8-05**: 39-agent filesystem detection (from agents-registry.ts)
- [ ] **AC-US8-06**: `vskill.lock` file for version pinning with SHA, scan date, tier
- [ ] **AC-US8-07**: Diff scanning on updates — highlights NEW patterns since last verified version
- [ ] **AC-US8-08**: Published as `vskill` on npm, `npx vskill` works out of the box
- [ ] **AC-US8-09**: Security score displayed with findings summary before install

---

### US-009: Cron Scanning & Monitoring (P2)
**Project**: specweave

**As a** platform operator
**I want** automated scanning of skill sources on a schedule
**So that** new skills are imported and existing skills are monitored for suspicious updates

**Acceptance Criteria**:
- [ ] **AC-US9-01**: Separate Cloudflare Worker with `scheduled()` handler
- [ ] **AC-US9-02**: Every 6h: check verified skills for updates (diff scan)
- [ ] **AC-US9-03**: Daily 2am: crawl 3 marketplaces for new skills
- [ ] **AC-US9-04**: Badge downgrade on suspicious update detection
- [ ] **AC-US9-05**: Cron worker deployed alongside main worker

---

### US-010: Email Notifications (P2)
**Project**: specweave

**As a** skill submitter who provided an email
**I want** to receive notifications about my submission status changes
**So that** I know when my skill is approved or needs attention

**Acceptance Criteria**:
- [ ] **AC-US10-01**: SendGrid integration with HTML email templates
- [ ] **AC-US10-02**: 5 triggers: submission_received, auto_approved, needs_review, rejected, version_published
- [ ] **AC-US10-03**: Email is opt-in only (no email field = no notifications)

---

### US-011: E2E Testing & Quality (P1)
**Project**: specweave

**As a** development team
**I want** comprehensive automated tests covering all critical paths
**So that** we can deploy with confidence and catch regressions early

**Acceptance Criteria**:
- [ ] **AC-US11-01**: Playwright E2E: landing page renders, skill listing + search, skill detail
- [ ] **AC-US11-02**: Playwright E2E: submission form → status tracker flow
- [ ] **AC-US11-03**: Playwright E2E: admin login → approve/reject flow
- [ ] **AC-US11-04**: Playwright E2E: badge API returns valid SVG
- [ ] **AC-US11-05**: Unit tests: scanner patterns >80% coverage
- [ ] **AC-US11-06**: Unit tests: state machine transitions, API route handlers, CLI commands
- [ ] **AC-US11-07**: Build passes with `npm run build`, bundle < 10 MiB compressed

## Functional Requirements

### FR-001: Build on 0217 architecture designs
All implementation follows the architecture decisions, data models, and design docs from increment 0217-skill-security-extensibility-standard.

### FR-002: @opennextjs/cloudflare deployment
Use the OpenNext Cloudflare adapter (NOT deprecated next-on-pages). Deploy to Cloudflare Workers with `nodejs_compat` flag.

### FR-003: Per-request Prisma client
Cloudflare Workers require per-request database client instantiation (no global singleton). Use `@prisma/adapter-neon` with `PrismaNeon`.

### FR-004: Workers AI for Tier 2
Use free Cloudflare Workers AI (`@cf/meta/llama-3.1-70b-instruct`) via `env.AI` binding for Tier 2 LLM scanning. No external API keys needed.

## Success Criteria

- verified-skill.com loads in browser with distinctive landing page
- Pre-verified skills from 3 marketplaces visible in listing
- Submit a test skill → flows through Tier 1 + Tier 2 → auto-approve
- `npx vskill add anthropics/skills --skill frontend-design` works
- Admin dashboard: login, view queue, approve/reject
- Cron runs: imports new skills, checks for updates
- Playwright E2E tests all pass
- Badge API: `GET /api/v1/skills/frontend-design/badge` returns valid SVG

## Out of Scope

- Custom domain email (use SendGrid transactional only)
- Payment/billing integration (all features are free under MIT license)
- GitHub OAuth for admin (Phase 2 — email/password for now)
- Mobile app
- GraphQL API (REST only)

## Cost Projections

| Resource | Provider | Free Tier | At 500 scans/day |
|----------|----------|-----------|-------------------|
| Workers AI (Llama 3.1 70B) | Cloudflare | ~10K neurons/day | ~$45/month |
| Cloudflare Queues | Cloudflare | 10K ops/day | Free (4,500 ops/day) |
| PostgreSQL | Neon | 0.5 GB storage | Free |
| Workers compute | Cloudflare | 100K req/day | Free |
| Email (SendGrid) | SendGrid | 100 emails/day | Free |
| **Total** | | | **~$45/month** |

Workers AI is the only component that exceeds free tier at scale. All other services stay within free tier at 500 submissions/day. No GPU management or instance scaling needed — Cloudflare handles this automatically.

## Dependencies

- 0217-skill-security-extensibility-standard: Architecture designs, data models, research
- Cloudflare account with Workers access
- Neon PostgreSQL account
- npm registry access for `vskill` package
- SendGrid account for email (EasyChamp account)
- Domain verified-skill.com (already purchased)
