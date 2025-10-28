---
name: specweave-review-docs
description: Review strategic documentation before implementation (PM analysis, architecture, ADRs, infrastructure, security, testing)
---

# Review Strategic Documentation

You are presenting strategic documentation for user review before implementation begins.

## Steps:

1. **Detect current increment**:
   - Look for most recent or in-progress increment in `.specweave/increments/`
   - Or ask: "Which increment would you like to review? (0001, 0002, 0003, etc.)"

2. **Read all strategic documentation**:
   - spec.md (user stories, requirements)
   - pm-analysis.md (if exists)
   - architecture.md, ADRs in `.specweave/docs/architecture/`, `.specweave/docs/decisions/`
   - infrastructure.md (if exists)
   - security.md (if exists)
   - test-strategy.md (if exists)

3. **Present comprehensive summary**:

## Review Format:

```
═══════════════════════════════════════════════════════
📋 Strategic Documentation Review
═══════════════════════════════════════════════════════

Increment: 0003-event-booking-saas
Title: Event Booking SaaS Platform
Priority: P1
Status: Planned

───────────────────────────────────────────────────────
✅ PRODUCT STRATEGY (pm-analysis.md)
───────────────────────────────────────────────────────

User Personas:
  1. Barber Shop Owner (primary)
     - Needs: Easy booking management, reduce no-shows
     - Pain points: Manual scheduling, phone tag

  2. Customer (secondary)
     - Needs: Quick booking, reminders
     - Pain points: Calling during business hours

Business Model:
  - Revenue: Subscription ($29/month per business)
  - Alternative: 3% commission per booking
  - Target: 100 businesses in Year 1 ($34k ARR)

Feature Prioritization:
  P1 (MVP):
    - Booking calendar
    - SMS/Email notifications
    - Payment processing

  P2 (Post-launch):
    - Recurring bookings
    - Multiple staff members
    - Analytics dashboard

Success Metrics:
  - Bookings per business: 50+/month
  - No-show reduction: 30%
  - Customer satisfaction: 4.5+/5

───────────────────────────────────────────────────────
✅ SYSTEM ARCHITECTURE (architecture.md)
───────────────────────────────────────────────────────

**IMPORTANT**: Architecture adapts to YOUR detected tech stack!

Tech Stack (detected from .specweave/config.yaml or project files):
  Frontend: {detected-frontend}  (e.g., NextJS, React, Vue, Angular, Svelte)
  Backend: {detected-backend}    (e.g., Django, FastAPI, Express, Spring Boot, Gin)
  Database: {specified-database} (e.g., PostgreSQL, MySQL, MongoDB, SQLite)
  ORM: {detected-orm}            (e.g., Prisma, Django ORM, SQLAlchemy, Hibernate, GORM)
  UI: {specified-ui}             (e.g., Tailwind, Material UI, Bootstrap, Chakra)
  Auth: {specified-auth}         (e.g., NextAuth, Django Auth, Passport, JWT, Auth0)
  Payments: {specified-payments} (e.g., Stripe, PayPal, Square)

System Design:
  [Mermaid diagram showing architecture using YOUR framework]

  Example for TypeScript/NextJS:
    User → NextJS (SSR) → API Routes → Prisma → PostgreSQL

  Example for Python/Django:
    User → Django (Templates) → Views → Django ORM → PostgreSQL

  Example for Go/Gin:
    User → Gin API → Handlers → GORM → PostgreSQL

  (Architecture diagram adapts to YOUR detected stack)

Data Models:
  - User (auth, profile)
  - Business (shop details)
  - Service (haircut, massage, etc.)
  - Booking (appointment)
  - Payment (transaction)

API Design:
  - POST /api/bookings/create
  - GET /api/bookings/:id
  - PUT /api/bookings/:id/cancel
  - GET /api/availability

Scalability:
  - Handles 10,000 users
  - 1,000 concurrent bookings/day
  - Redis caching for availability queries
  - Database indexing on booking_date, business_id

───────────────────────────────────────────────────────
✅ ARCHITECTURE DECISIONS (ADRs)
───────────────────────────────────────────────────────

**ADRs are framework-specific and adapt to YOUR project**

Example ADRs for TypeScript/NextJS project:
  ADR 001: NextJS over separate React + API
    - Reason: Simplified deployment, SSR benefits
    - Trade-off: Less separation of concerns

Example ADRs for Python/Django project:
  ADR 001: Django monolith over microservices
    - Reason: Faster development, easier deployment for MVP
    - Trade-off: Harder to scale individual components

Example ADRs for Go/Gin project:
  ADR 001: Gin over Echo
    - Reason: Better performance, larger community
    - Trade-off: Less built-in middleware

Platform Decision (adapts to user preference):
  ADR 00X: {Platform} over {Alternative}
    - Reason: Cost, performance, or developer familiarity
    - Examples: Hetzner ($12/mo), Vercel ($20/mo), AWS ($25/mo), self-hosted

Database Decision (adapts to use case):
  ADR 00X: {Database} over {Alternative}
    - Reason: ACID compliance, scaling needs, or data structure
    - Examples: PostgreSQL (relational), MongoDB (document), Redis (cache)

───────────────────────────────────────────────────────
✅ INFRASTRUCTURE (infrastructure.md)
───────────────────────────────────────────────────────

**Infrastructure adapts to chosen platform**

Platform: {detected-platform} (e.g., Hetzner, AWS, Vercel, self-hosted)

Example for Hetzner Cloud:
  Resources:
    - CX21 instance (2 vCPU, 4GB RAM): $6.90/month
    - Managed Postgres (2GB): $5.00/month
    - Total: ~$12/month

Example for AWS:
  Resources:
    - t3.small EC2 (2 vCPU, 2GB RAM): $15/month
    - RDS PostgreSQL (db.t3.micro): $12/month
    - Total: ~$27/month

Example for Vercel:
  Resources:
    - Hobby tier (for small projects): $20/month
    - Pro tier (for production): $20/month
    - Database (Neon/PlanetScale): $0-10/month

Deployment:
  - Docker containers
  - GitHub Actions CI/CD
  - Blue-green deployment
  - Automated backups (daily)

Monitoring:
  - Uptime Kuma (self-hosted)
  - Error tracking: Sentry (free tier)
  - Analytics: Plausible (self-hosted)

DNS & SSL:
  - Cloudflare (free tier)
  - Let's Encrypt (auto-renewal)

───────────────────────────────────────────────────────
✅ SECURITY (security.md)
───────────────────────────────────────────────────────

**Security strategy adapts to YOUR framework**

Authentication (framework-specific):
  - TypeScript/NextJS: NextAuth.js with credentials + OAuth
  - Python/Django: Django Auth with Allauth
  - Go/Gin: JWT tokens with middleware
  - Java/Spring: Spring Security with OAuth2

  Providers: Google, GitHub, Email magic links (framework-agnostic)
  Session management: JWT or session cookies (framework-dependent)

Authorization (framework-specific):
  - TypeScript/Prisma: Row-level security in PostgreSQL
  - Python/Django: Django permissions + object-level permissions
  - Go/GORM: Middleware-based access control
  - Java/Spring: Spring Security annotations

  Business logic:
    - Businesses can only access their own data
    - Customers can only see their own bookings

Data Protection (framework-agnostic):
  - GDPR compliant
  - Data encryption at rest (database-level)
  - HTTPS only (enforced)
  - PII data: minimal collection

Payment Security (framework-agnostic):
  - Stripe (PCI-DSS compliant)
  - No card data stored locally
  - Webhook signature verification (framework-specific implementation)

───────────────────────────────────────────────────────
✅ TEST STRATEGY (test-strategy.md)
───────────────────────────────────────────────────────

Test Pyramid:
  E2E Tests (10%): Playwright
    - Complete booking flow
    - Payment flow
    - Cancellation flow

  Integration Tests (30%): Jest + Testing Library
    - API endpoints
    - Database queries
    - External service mocks (Stripe, Vonage)

  Unit Tests (60%): Jest
    - Business logic
    - Utilities
    - Validation functions

Coverage Target: 80%

Critical Paths (E2E):
  1. Business signup → Create service → Receive booking
  2. Customer booking → Payment → Confirmation
  3. Cancellation → Refund

Performance Tests:
  - 100 concurrent bookings
  - Response time <200ms (p95)
  - Database query optimization

───────────────────────────────────────────────────────
💰 COST ESTIMATE
───────────────────────────────────────────────────────

Infrastructure: $12/month
External Services:
  - Stripe: 2.9% + $0.30 per transaction
  - Resend: $20/month (10k emails)
  - Vonage: $10/month (~2k SMS)

Total Monthly: $42/month (at 100 businesses)

Revenue: $2,900/month (100 businesses * $29)
Profit: $2,858/month (98% margin)

───────────────────────────────────────────────────────
⏱️  IMPLEMENTATION ESTIMATE
───────────────────────────────────────────────────────

Total Tasks: 42
Estimated Time: 3-4 weeks (1 developer)

Phases:
  Week 1: Infrastructure + Backend (Tasks T001-T020)
  Week 2: Frontend (Tasks T021-T035)
  Week 3: Testing (Tasks T036-T040)
  Week 4: Deployment + Polish (Tasks T041-T042)

═══════════════════════════════════════════════════════

Do you approve this plan?

Options:
  ✅ "approve" - Start creating tasks.md
  ⚠️  "changes needed" - Request specific updates
  📋 "questions" - Ask clarifying questions
  🔄 "regenerate" - Regenerate strategic analysis

───────────────────────────────────────────────────────
```

## After User Approval:

If user approves:
```
✅ Strategic documentation approved

   Next steps:
   1. Creating tasks.md with task-builder skill...
   2. Breaking down into 42 implementation tasks...
   3. Estimated completion: [date]

   Once tasks.md is ready:
   - Type "start implementation" to begin Task T001
   - Or review tasks first with: cat .specweave/increments/0003-event-booking-saas/tasks.md
```

If user requests changes:
```
What would you like to change?
  1. Architecture (tech stack, design)
  2. Infrastructure (platform, cost)
  3. Features (scope, priorities)
  4. Security approach
  5. Other
```

Then run appropriate agents again and re-present.

---

**Important**: This command is critical for ensuring user approval before starting costly implementation work.
