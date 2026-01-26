# Implementation Plan: React Dashboard with Stripe Checkout and .NET Backend

## Overview

Three-tier architecture with React SPA frontend, .NET 8 Web API backend, and PostgreSQL database. Stripe handles all payment processing via Checkout Sessions and Customer Portal. Communication between frontend and backend uses REST over HTTPS with JWT authentication.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  React 18 + TypeScript + Vite                           │   │
│  │  ├── /src/pages (Dashboard, Analytics, Billing, Settings)│   │
│  │  ├── /src/components (Sidebar, Charts, Cards)           │   │
│  │  └── /src/services (api.ts, stripe.ts)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  .NET 8 Web API                                         │   │
│  │  ├── Controllers (Analytics, User, Webhooks)            │   │
│  │  ├── Services (AnalyticsService, StripeService)         │   │
│  │  └── Data (AppDbContext, Repositories)                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
          │                                    │
          ▼                                    ▼
┌──────────────────┐                ┌──────────────────┐
│   PostgreSQL     │                │     Stripe       │
│   - Users        │                │  - Checkout      │
│   - Subscriptions│                │  - Webhooks      │
│   - UsageMetrics │                │  - Portal        │
└──────────────────┘                └──────────────────┘
```

### Components

**Frontend (React)**:
- `DashboardLayout`: Main layout with sidebar navigation
- `AnalyticsPage`: KPI cards + charts (Recharts)
- `BillingPage`: Subscription status + Stripe portal link
- `PricingPage`: Plan cards with Stripe Checkout buttons

**Backend (.NET)**:
- `AnalyticsController`: GET /api/analytics/summary, /api/analytics/usage
- `UserController`: GET /api/user/profile
- `WebhooksController`: POST /api/webhooks/stripe
- `StripeService`: Create checkout sessions, verify webhooks

### Data Model

```sql
-- Users table
Users {
  Id: Guid (PK)
  Email: string (unique)
  Name: string
  StripeCustomerId: string (nullable)
  CreatedAt: DateTime
}

-- Subscriptions table
Subscriptions {
  Id: Guid (PK)
  UserId: Guid (FK -> Users)
  StripeSubscriptionId: string
  PlanId: string (free|pro|enterprise)
  Status: string (active|cancelled|past_due)
  CurrentPeriodEnd: DateTime
  CreatedAt: DateTime
  UpdatedAt: DateTime
}

-- UsageMetrics table (for analytics)
UsageMetrics {
  Id: Guid (PK)
  UserId: Guid (FK -> Users)
  MetricDate: Date
  ActiveSessions: int
  ApiCalls: int
  CreatedAt: DateTime
}
```

### API Contracts

| Endpoint | Method | Auth | Request | Response |
|----------|--------|------|---------|----------|
| `/api/analytics/summary` | GET | JWT | - | `{ users: int, revenue: decimal, sessions: int, conversionRate: float }` |
| `/api/analytics/usage` | GET | JWT | `?days=30` | `[{ date: string, value: int }]` |
| `/api/user/profile` | GET | JWT | - | `{ id, email, name, subscription: {...} }` |
| `/api/checkout/create-session` | POST | JWT | `{ priceId: string }` | `{ sessionUrl: string }` |
| `/api/webhooks/stripe` | POST | Signature | Stripe Event | 200 OK |

## Technology Stack

**Frontend**:
- React 18.3 + TypeScript 5.x
- Vite 5.x (build tool)
- Tailwind CSS 3.x (styling)
- Recharts 2.x (charts)
- React Router 6.x (routing)
- Axios (HTTP client)

**Backend**:
- .NET 8 (LTS)
- ASP.NET Core Web API
- Entity Framework Core 8 (ORM)
- Npgsql (PostgreSQL driver)
- Stripe.net (Stripe SDK)

**Infrastructure**:
- PostgreSQL 16 (Docker for local)
- Docker Compose (local dev)

**Architecture Decisions**:

1. **Vite over CRA**: Faster builds, native ESM, better DX
2. **Tailwind over CSS-in-JS**: Utility-first, smaller bundle, faster styling
3. **Stripe Checkout over embedded**: PCI compliance handled by Stripe, less code
4. **.NET 8 over Node.js**: Strong typing, better performance, native Stripe SDK
5. **PostgreSQL over SQLite**: Production-ready, better for analytics queries

## Implementation Phases

### Phase 1: Foundation (US-001, US-005)
1. Initialize React project with Vite + TypeScript
2. Initialize .NET Web API project
3. Set up PostgreSQL with Docker Compose
4. Create EF Core DbContext and migrations
5. Implement dashboard layout with sidebar
6. Create basic API endpoints (profile, analytics mock)

### Phase 2: Core Features (US-002, US-003, US-006)
1. Implement analytics charts with Recharts
2. Connect frontend to real API data
3. Set up Stripe test account and keys
4. Implement Checkout session creation
5. Build webhook handler for subscription events
6. Create pricing page with Checkout integration

### Phase 3: Polish (US-004)
1. Implement Stripe Customer Portal integration
2. Add subscription management UI
3. Real-time subscription status updates
4. Error handling and loading states
5. Mobile responsive refinements

## Testing Strategy

**Backend (.NET)**:
- Unit tests: xUnit + Moq for services
- Integration tests: WebApplicationFactory for API endpoints
- Target: 80% coverage

**Frontend (React)**:
- Unit tests: Vitest + React Testing Library
- Component tests: Key UI components
- Target: 70% coverage

**E2E** (future):
- Playwright for critical flows (checkout, dashboard)

## Technical Challenges

### Challenge 1: Stripe Webhook Verification
**Problem**: Ensuring webhook requests are genuinely from Stripe
**Solution**: Use `Stripe-Signature` header with `ConstructEvent()` validation
**Risk**: Clock skew - mitigate with 5-minute tolerance

### Challenge 2: Subscription State Sync
**Problem**: Frontend may show stale subscription status
**Solution**: Poll `/api/user/profile` every 30s when on billing page, plus webhook updates
**Risk**: Race condition - use optimistic UI with server reconciliation

### Challenge 3: Local Development with Stripe
**Problem**: Webhooks need public URL for Stripe to call
**Solution**: Use Stripe CLI `stripe listen --forward-to localhost:5000/api/webhooks/stripe`

## Folder Structure

```
~/Projects/react-dash-stripe/
├── frontend/                    # React app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                     # .NET API
│   ├── Controllers/
│   ├── Services/
│   ├── Data/
│   ├── Models/
│   └── ReactDashStripe.Api.csproj
├── docker-compose.yml           # PostgreSQL + dev services
└── README.md
