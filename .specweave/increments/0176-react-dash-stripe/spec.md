---
increment: 0176-react-dash-stripe
title: "React Dashboard with Stripe Checkout and .NET Backend"
type: feature
priority: P1
status: planned
created: 2026-01-26
structure: user-stories
test_mode: test-after
coverage_target: 80
external_path: "~/Projects/react-dash-stripe"
---

# Feature: React Dashboard with Stripe Checkout and .NET Backend

## Overview

Full-stack SaaS dashboard application with:
- **Frontend**: React 18+ with TypeScript, Tailwind CSS, Recharts for data visualization
- **Payments**: Stripe Checkout for subscription billing
- **Backend**: .NET 8 Web API with Entity Framework Core

**External Project Location**: `~/Projects/react-dash-stripe`

## User Stories

### US-001: Dashboard Layout and Navigation (P1)
**Project**: react-dash-stripe
**Board**: frontend

**As a** logged-in user
**I want** a responsive dashboard with sidebar navigation
**So that** I can easily access different sections of the application

**Acceptance Criteria**:
- [ ] **AC-US1-01**: Dashboard renders with collapsible sidebar containing Home, Analytics, Billing, Settings links
- [ ] **AC-US1-02**: Layout is responsive (mobile: bottom nav, tablet+: sidebar)
- [ ] **AC-US1-03**: Active navigation item is visually highlighted
- [ ] **AC-US1-04**: User avatar and name displayed in header with logout option

---

### US-002: Analytics Dashboard with Charts (P1)
**Project**: react-dash-stripe
**Board**: frontend

**As a** user
**I want** to see my usage metrics in visual charts
**So that** I can understand my consumption patterns

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Line chart displays daily usage over last 30 days
- [ ] **AC-US2-02**: Bar chart shows monthly comparison (current vs previous)
- [ ] **AC-US2-03**: KPI cards display: Total Users, Revenue, Active Sessions, Conversion Rate
- [ ] **AC-US2-04**: Charts load with skeleton placeholder while fetching data

---

### US-003: Stripe Checkout Integration (P1)
**Project**: react-dash-stripe
**Board**: payments

**As a** user
**I want** to subscribe to a plan via Stripe Checkout
**So that** I can access premium features

**Acceptance Criteria**:
- [ ] **AC-US3-01**: Pricing page displays 3 plans (Free, Pro $19/mo, Enterprise $99/mo)
- [ ] **AC-US3-02**: Clicking "Subscribe" redirects to Stripe Checkout session
- [ ] **AC-US3-03**: Success page shown after successful payment with subscription details
- [ ] **AC-US3-04**: Cancel page shown if user abandons checkout

---

### US-004: Subscription Management (P2)
**Project**: react-dash-stripe
**Board**: payments

**As a** subscribed user
**I want** to manage my subscription (view, cancel, update payment)
**So that** I have control over my billing

**Acceptance Criteria**:
- [ ] **AC-US4-01**: Billing page shows current plan, next billing date, payment method (last 4 digits)
- [ ] **AC-US4-02**: "Manage Subscription" button opens Stripe Customer Portal
- [ ] **AC-US4-03**: Subscription status updates reflect within 30 seconds of webhook

---

### US-005: .NET Backend API (P1)
**Project**: react-dash-stripe
**Board**: backend

**As a** frontend application
**I want** RESTful API endpoints for dashboard data
**So that** the UI can fetch and display information

**Acceptance Criteria**:
- [ ] **AC-US5-01**: `GET /api/analytics/summary` returns KPI data (users, revenue, sessions, conversion)
- [ ] **AC-US5-02**: `GET /api/analytics/usage?days=30` returns daily usage array
- [ ] **AC-US5-03**: `GET /api/user/profile` returns authenticated user info
- [ ] **AC-US5-04**: All endpoints require JWT authentication via Bearer token
- [ ] **AC-US5-05**: API returns proper error responses (400, 401, 404, 500) with consistent schema

---

### US-006: Stripe Webhook Handler (P1)
**Project**: react-dash-stripe
**Board**: backend

**As a** system
**I want** to process Stripe webhooks for subscription events
**So that** user subscription status stays synchronized

**Acceptance Criteria**:
- [ ] **AC-US6-01**: `POST /api/webhooks/stripe` validates webhook signature using Stripe secret
- [ ] **AC-US6-02**: Handles `checkout.session.completed` - creates/updates subscription record
- [ ] **AC-US6-03**: Handles `customer.subscription.updated` - updates plan/status
- [ ] **AC-US6-04**: Handles `customer.subscription.deleted` - marks subscription as cancelled
- [ ] **AC-US6-05**: Invalid signatures return 400, valid webhooks return 200

## Functional Requirements

### FR-001: Authentication
JWT-based authentication with refresh tokens. Frontend stores tokens in httpOnly cookies.

### FR-002: Database
PostgreSQL with Entity Framework Core. Tables: Users, Subscriptions, UsageMetrics.

### FR-003: Environment Configuration
All secrets (Stripe keys, JWT secret, DB connection) via environment variables.

## Success Criteria

- [ ] User can sign up, subscribe via Stripe, and access dashboard
- [ ] Analytics charts display real data from backend API
- [ ] Subscription lifecycle (create, update, cancel) works end-to-end
- [ ] 80%+ test coverage on backend, 70%+ on frontend

## Out of Scope

- User registration/login (use mock auth for MVP)
- Email notifications
- Multiple currency support
- Invoicing/receipts download
- Admin panel

## Dependencies

- Stripe account with test API keys
- PostgreSQL database (local Docker or cloud)
- Node.js 20+ for React frontend
- .NET 8 SDK for backend
