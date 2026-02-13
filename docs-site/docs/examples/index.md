---
sidebar_position: 8
title: Real-World Examples
description: See SpecWeave in action with real production use cases
keywords: [examples, use cases, real-world, production, mobile, microservices, brownfield]
---

# Real-World Examples

See how SpecWeave handles real production scenarios - from mobile apps to microservices to brownfield documentation.

:::tip All Examples Are Real
These aren't toy examples. They're based on actual SpecWeave increments from production projects, including SpecWeave itself (150+ features built with SpecWeave).
:::

---

## Mobile App Development

### Building a React Native Business Card Scanner

**Duration**: 2.5 hours autonomous execution
**Lines of Code**: ~3,200
**Tests Written**: 42 (unit + integration + E2E)

#### The Challenge

Build "BizZone" - a mobile app that scans business cards using the camera, extracts contact info with OCR, and saves to local storage with offline sync.

#### The SpecWeave Approach

```bash
/sw:increment "Business card scanner with OCR and offline storage"
```

**Spec created** (`spec.md`):
- 4 user stories (camera capture, OCR processing, contact storage, offline sync)
- 18 acceptance criteria
- Success metrics (scan accuracy >90%, offline-first)

**Plan generated** (`plan.md`):
- **Architecture Decision**: Expo Camera API + Google ML Kit OCR
- **ADR-001**: Why Expo over bare React Native (faster iteration, managed workflow)
- **ADR-002**: AsyncStorage + Network State for offline-first
- **Tech Stack**: Expo SDK 50, TypeScript, Zustand for state

**Tasks breakdown** (`tasks.md`):
- 25 tasks with embedded BDD tests
- Integration tests for camera permissions
- E2E tests with Playwright (test mode camera)

#### Autonomous Execution

```bash
/sw:auto
```

**What happened** (over 2.5 hours):

1. **Setup** (Iteration 1-5): Installed Expo dependencies, configured Camera permissions
2. **Camera Screen** (Iteration 6-12): Built UI, integrated camera, added capture button
3. **OCR Integration** (Iteration 13-20): Connected ML Kit, text extraction, contact parsing
4. **Storage Layer** (Iteration 21-28): AsyncStorage setup, contact CRUD operations
5. **Offline Sync** (Iteration 29-35): Network state detection, queue system, sync logic
6. **Testing** (Iteration 36-47): Wrote and ran 42 tests, fixed 3 failing tests via self-healing

**Final output**:
```
✅ AUTO SESSION COMPLETE
📊 SESSION SUMMARY
├─ Iterations: 47/2500
├─ Tasks completed: 25/25
├─ Tests: 42 passed, 0 failed
├─ Files created: 18 source + 14 test files
└─ Living docs: Updated with API specs
```

#### Key Features Demonstrated

- ✅ **Mobile-specific skills** auto-routed (React Native architect, mobile testing)
- ✅ **Platform-specific tests** (Camera permissions, AsyncStorage mocking)
- ✅ **Expo workflow** (managed build, EAS integration)
- ✅ **Self-healing** (3 test failures fixed autonomously)

**See the increment**: [Browse mobile app increment →](https://github.com/anton-abyzov/specweave/tree/develop/.specweave/increments/0089-bizzone-scanner)

---

## Microservices Coordination

### Adding Payment Webhooks Across 3 Repos

**Duration**: 1.2 hours autonomous execution
**Repositories**: 3 (backend service, frontend, shared types)
**Pull Requests Created**: 3 (auto-synced to GitHub)

#### The Challenge

Add Stripe payment webhooks that require changes across:
- `shared/` - New TypeScript types for webhook events
- `backend/` - Webhook handler endpoint + validation
- `frontend/` - UI to show payment status

#### The SpecWeave Approach

```bash
# In umbrella project root
/sw:increment "Add Stripe payment webhooks across all services"
```

**Multi-repo structure**:
```
my-project/
├── repositories/
│   ├── shared/          # Types package
│   ├── backend/         # Express API
│   └── frontend/        # React app
└── .specweave/
    └── increments/0042-payment-webhooks/
```

**Spec created**:
- Cross-repo user stories (type definitions, backend handler, frontend display)
- Dependency graph (shared → backend → frontend)
- Acceptance criteria with repo tags

**Plan generated**:
- **ADR-003**: Why webhook validation over polling (real-time, Stripe best practice)
- **ADR-004**: Event-driven architecture with domain events
- **Execution order**: shared first (types), then backend (handler), then frontend (UI)

#### Autonomous Execution

```bash
/sw:auto
```

**What happened**:

1. **Shared types** (Iteration 1-8):
   - Created `PaymentWebhookEvent` interface
   - Added event type enum
   - Exported from index
   - `npm link` for local development

2. **Backend handler** (Iteration 9-22):
   - Installed `stripe` SDK
   - Created `/webhooks/payment` endpoint
   - Added signature validation
   - Wrote integration tests (mocked Stripe)
   - Used `npm link shared` for local types

3. **Frontend UI** (Iteration 23-30):
   - Created `PaymentStatus` component
   - Polling endpoint for status updates
   - Success/failure states
   - E2E test with mock webhook

4. **GitHub sync** (Iteration 31-35):
   - Created 3 PRs automatically
   - Linked PRs in descriptions
   - Added review checklist

**Final output**:
```
✅ AUTO SESSION COMPLETE
📊 SESSION SUMMARY
├─ Repositories: 3 (shared, backend, frontend)
├─ Pull Requests: 3 created and linked
├─ Tests: 67 passed (28 unit, 24 integration, 15 E2E)
└─ Living docs: Cross-repo architecture diagram added
```

#### Key Features Demonstrated

- ✅ **Multi-repo coordination** with dependency order
- ✅ **GitHub sync** creates linked PRs
- ✅ **npm link workflow** for local cross-repo development
- ✅ **E2E testing** across service boundaries

---

## Brownfield Documentation

### Documenting a 10-Year-Old Legacy Codebase

**Duration**: 3 hours (manual + auto hybrid)
**Codebase Size**: 450,000 lines of code
**Documentation Generated**: 127 pages

#### The Challenge

Inherit a decade-old PHP monolith with:
- Zero documentation
- 47 database tables (no ER diagrams)
- 200+ endpoints (no API specs)
- Business logic scattered across 80 files

**Goal**: Onboard new developers in days, not months.

#### The SpecWeave Approach

**Phase 1: Discovery** (Manual - 1 hour)
```bash
/sw:living-docs --brownfield --discovery-mode
```

SpecWeave scanned the codebase and generated:
- Module detection report (12 domains found: Auth, Orders, Payments, Inventory, etc.)
- Discrepancy list (code without docs)
- Recommended documentation structure

**Phase 2: Incremental Documentation** (Auto - 2 hours)

Created 12 increments (one per domain):
```bash
/sw:increment "Document Authentication Module"
/sw:increment "Document Orders Module"
# ... 10 more
```

Each increment generated:
- **spec.md**: What the module does (business purpose)
- **plan.md**: How it works (architecture, database schema, API endpoints)
- **tasks.md**: Document each class/function

**Executed autonomously**:
```bash
/sw:auto --queue-all
```

#### What Happened

For each module, SpecWeave:
1. **Analyzed code** (function signatures, dependencies, database queries)
2. **Generated docs** (markdown with code examples)
3. **Created diagrams** (ER diagrams, sequence diagrams via Mermaid)
4. **Extracted business logic** (found implicit rules in code)
5. **Built search index** (searchable documentation site)

**Example output for "Orders Module"**:

```markdown
# Orders Module

## Overview
Handles order creation, fulfillment, and status tracking.

## Database Schema
**Tables**: orders, order_items, order_status_history

**Relationships**:
- orders 1:N order_items
- orders 1:N order_status_history

## API Endpoints

### POST /api/orders
Creates a new order with validation.

**Request**:
```json
{
  "customer_id": 123,
  "items": [{"product_id": 456, "quantity": 2}]
}
```

**Business Rules**:
- Must validate customer exists
- Must check inventory availability
- Must calculate tax based on shipping address
- Triggers email notification on success
```

#### Key Features Demonstrated

- ✅ **Brownfield discovery** finds undocumented modules
- ✅ **Code-to-spec extraction** reverse-engineers business logic
- ✅ **Diagram generation** creates visual architecture docs
- ✅ **Searchable docs** via Docusaurus integration
- ✅ **Discrepancy tracking** identifies code-to-spec drift

**Result**: New developers onboarded in 2 days (down from 2-3 months).

---

## GitHub Actions CI/CD Integration

### Automated Release Pipeline

**Scenario**: Publish npm package on every increment completion

#### Setup

```yaml
# .github/workflows/release.yml
name: SpecWeave Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      - name: Install SpecWeave
        run: npm install -g specweave

      - name: Validate Increment
        run: specweave validate --increment=${{ github.ref_name }}

      - name: Build
        run: npm run build

      - name: Publish to npm
        run: npm publish --registry https://registry.npmjs.org
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        run: |
          gh release create ${{ github.ref_name }} \
            --title "${{ github.ref_name }}" \
            --notes-file .specweave/increments/*/reports/completion-report.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Workflow

```bash
# Developer completes increment
/sw:done 0089

# SpecWeave automatically:
# 1. Validates all quality gates
# 2. Bumps version in package.json
# 3. Creates git tag
# 4. Pushes to GitHub

# GitHub Actions triggers:
# 5. Runs tests
# 6. Builds package
# 7. Publishes to npm
# 8. Creates GitHub Release with notes
```

**Result**: Zero-touch releases. From `/sw:done` to npm in 2 minutes.

---

## Performance: Large-Scale Refactoring

### Refactoring 50 Files with Test Safety Net

**Duration**: 1.8 hours autonomous
**Files Changed**: 52
**Tests Maintained**: 186 (all passing throughout)

#### The Challenge

Refactor authentication system from session-based to JWT:
- 50 files use old `req.session`
- Need to migrate to `req.user` (JWT)
- Can't break existing functionality
- Must maintain test coverage

#### The SpecWeave Approach

```bash
/sw:increment "Migrate auth from sessions to JWT"
```

**TDD Strict Mode enabled**:
```json
{
  "auto": {
    "tddStrictMode": true
  }
}
```

**Spec created**:
- Backward compatibility during migration
- Rollout strategy (feature flag)
- Rollback plan if issues arise

**Tasks breakdown** (52 tasks):
- One task per file migration
- Each task has embedded tests
- Integration tests added
- E2E tests updated

#### Autonomous Execution with TDD Discipline

```bash
/sw:auto
```

**What happened**:

Auto mode **blocked 3 times** when tests failed:
1. **Iteration 18**: Middleware order wrong → Fixed, tests green
2. **Iteration 34**: Database schema migration missing → Added, tests green
3. **Iteration 47**: E2E test timeout → Increased timeout, tests green

**Every time**:
- Auto mode detected failure
- Analyzed error
- Applied fix
- Re-ran tests
- Continued only when green

**Final output**:
```
✅ AUTO SESSION COMPLETE
📊 SESSION SUMMARY
├─ Files migrated: 52
├─ Tests maintained: 186 (100% passing)
├─ Zero regressions detected
├─ Rollback not needed
└─ Living docs: Migration guide added
```

#### Key Features Demonstrated

- ✅ **TDD strict mode** ensures tests always pass
- ✅ **Self-healing** fixes test failures automatically (up to 3 retries)
- ✅ **Regression prevention** validates every change
- ✅ **Rollback safety** via feature flag and comprehensive tests

---

## Comparison Matrix

| Use Case | Duration | LOC | Tests | Key Feature |
|----------|----------|-----|-------|-------------|
| **Mobile App** | 2.5h | 3,200 | 42 | Mobile-specific skills |
| **Microservices** | 1.2h | 1,800 | 67 | Multi-repo coordination |
| **Brownfield Docs** | 3h | 450k analyzed | N/A | Code-to-spec extraction |
| **CI/CD Pipeline** | 2min | Setup only | N/A | GitHub Actions integration |
| **Large Refactor** | 1.8h | 52 files | 186 | TDD strict mode |

---

## Try These Examples

### Starter Projects

**Easy** (30 minutes):
```bash
/sw:increment "Add dark mode toggle to website"
```

**Medium** (1-2 hours):
```bash
/sw:increment "Build REST API with CRUD operations and tests"
```

**Advanced** (2-4 hours):
```bash
/sw:increment "Create React Native todo app with offline sync"
```

### Learning Path

1. **Start small** - Single-repo, 5-10 tasks
2. **Add complexity** - Multi-file changes, more tests
3. **Go autonomous** - Let `/sw:auto` run for hours
4. **Scale up** - Multi-repo, complex integrations

---

## Community Examples

Share your SpecWeave success stories! [Join Discord](https://discord.gg/UYg4BGJ65V) and post in `#show-and-tell`.

### Featured Community Projects

- **E-commerce Platform** (3 developers, 6 months, 200 increments)
- **Healthcare Dashboard** (HIPAA-compliant, brownfield migration)
- **IoT Device Manager** (multi-repo, 12 services)

---

## What's Your Use Case?

Not seeing your scenario? SpecWeave handles:

- ✅ Single-page apps (React, Vue, Angular)
- ✅ Full-stack monoliths (Next.js, Rails, Django)
- ✅ Microservices (multi-repo, event-driven)
- ✅ Mobile apps (React Native, Expo, Flutter coming)
- ✅ CLI tools (Node, Python, Go)
- ✅ Libraries & SDKs (published to npm/PyPI)
- ✅ Documentation sites (Docusaurus, VitePress)
- ✅ Infrastructure (Terraform, Kubernetes)
- ✅ Non-code automation (research, knowledge management, publishing workflows)

**Not building software?** See our [Life Automation guide](/docs/guides/life-automation) for non-code use cases — Obsidian automation, internet research, rapid prototyping, and more.

[Contact us](https://discord.gg/UYg4BGJ65V) to discuss your specific use case!

---

## Next Steps

- **Try an example**: Pick one from above and run it
- **Read the guides**: [Guides section](/docs/guides/multi-project-setup)
- **Watch videos**: [YouTube tutorials](https://www.youtube.com/@antonabyzov)
- **Join community**: [Discord](https://discord.gg/UYg4BGJ65V)
