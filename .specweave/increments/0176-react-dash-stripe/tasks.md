# Tasks: React Dashboard with Stripe Checkout and .NET Backend

## Task Notation

- `[ ]`: Not started | `[x]`: Completed
- Model: ⚡ haiku (simple) | 💎 opus (complex)
- `[P]`: Parallelizable

---

## Phase 1: Project Setup

### T-001: Initialize monorepo structure ⚡
**User Story**: Foundation
**Status**: [x] completed

**Implementation**:
```bash
cd ~/Projects/react-dash-stripe
mkdir -p frontend backend
```

**Deliverables**: Base folder structure created

---

### T-002: Initialize React frontend with Vite ⚡
**User Story**: US-001
**Satisfies ACs**: Foundation for AC-US1-01
**Status**: [x] completed
**Depends On**: T-001

**Implementation**:
```bash
cd ~/Projects/react-dash-stripe/frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom axios recharts
```

**Test Plan**:
- **File**: `frontend/src/App.test.tsx`
- **TC-001**: App renders without crashing
  - Given: Fresh React app
  - When: App component mounts
  - Then: No errors thrown

---

### T-003: Initialize .NET Web API project ⚡
**User Story**: US-005
**Satisfies ACs**: Foundation for AC-US5-01
**Status**: [x] completed
**Depends On**: T-001

**Implementation**:
```bash
cd ~/Projects/react-dash-stripe/backend
dotnet new webapi -n ReactDashStripe.Api
cd ReactDashStripe.Api
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Stripe.net
```

---

### T-004: Create Docker Compose for PostgreSQL ⚡
**User Story**: US-005
**Status**: [x] completed
**Depends On**: T-001

**Implementation**: Create `docker-compose.yml` with PostgreSQL 16 service

**Deliverables**: `docker-compose.yml` at project root

---

## Phase 2: Backend Core (US-005, US-006)

### T-005: Create EF Core DbContext and entities 💎
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02
**Status**: [x] completed
**Depends On**: T-003, T-004

**Implementation**:
- Create `Models/User.cs`, `Models/Subscription.cs`, `Models/UsageMetric.cs`
- Create `Data/AppDbContext.cs`
- Add connection string to `appsettings.json`
- Run `dotnet ef migrations add Initial`

**Test Plan**:
- **File**: `backend/ReactDashStripe.Api.Tests/Data/AppDbContextTests.cs`
- **TC-005-01**: DbContext connects to PostgreSQL
  - Given: Valid connection string
  - When: DbContext instantiated
  - Then: CanConnect() returns true

---

### T-006: Implement AnalyticsController 💎
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-04, AC-US5-05
**Status**: [x] completed
**Depends On**: T-005

**Implementation**:
- Create `Controllers/AnalyticsController.cs`
- `GET /api/analytics/summary` - returns KPI data
- `GET /api/analytics/usage?days=30` - returns daily usage array
- Add `[Authorize]` attribute for JWT protection

**Test Plan**:
- **File**: `backend/ReactDashStripe.Api.Tests/Controllers/AnalyticsControllerTests.cs`
- **TC-006-01**: Summary endpoint returns valid KPIs
  - Given: Authenticated user with usage data
  - When: GET /api/analytics/summary
  - Then: Response contains users, revenue, sessions, conversionRate
- **TC-006-02**: Usage endpoint respects days parameter
  - Given: 45 days of usage data
  - When: GET /api/analytics/usage?days=30
  - Then: Response contains exactly 30 entries
- **TC-006-03**: Unauthenticated request returns 401
  - Given: No JWT token
  - When: GET /api/analytics/summary
  - Then: 401 Unauthorized

---

### T-007: Implement UserController 💎
**User Story**: US-005
**Satisfies ACs**: AC-US5-03, AC-US5-04
**Status**: [ ] pending
**Depends On**: T-005

**Implementation**:
- Create `Controllers/UserController.cs`
- `GET /api/user/profile` - returns user info with subscription

**Test Plan**:
- **File**: `backend/ReactDashStripe.Api.Tests/Controllers/UserControllerTests.cs`
- **TC-007-01**: Profile returns user with subscription
  - Given: User has active Pro subscription
  - When: GET /api/user/profile
  - Then: Response includes subscription.planId = "pro"

---

### T-008: Implement Stripe webhook handler 💎
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05
**Status**: [ ] pending
**Depends On**: T-005

**Implementation**:
- Create `Controllers/WebhooksController.cs`
- Create `Services/StripeService.cs`
- Validate webhook signature with Stripe secret
- Handle: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**Test Plan**:
- **File**: `backend/ReactDashStripe.Api.Tests/Controllers/WebhooksControllerTests.cs`
- **TC-008-01**: Valid signature processes event
  - Given: Valid Stripe webhook with checkout.session.completed
  - When: POST /api/webhooks/stripe
  - Then: Subscription created, returns 200
- **TC-008-02**: Invalid signature rejected
  - Given: Tampered webhook payload
  - When: POST /api/webhooks/stripe
  - Then: Returns 400 Bad Request
- **TC-008-03**: Subscription deletion handled
  - Given: Active subscription exists
  - When: customer.subscription.deleted webhook received
  - Then: Subscription status = "cancelled"

---

## Phase 3: Frontend Core (US-001, US-002)

### T-009: Create dashboard layout with sidebar 💎
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Depends On**: T-002

**Implementation**:
- Create `components/Sidebar.tsx` with navigation links
- Create `components/DashboardLayout.tsx` wrapper
- Implement responsive behavior (sidebar on desktop, bottom nav on mobile)
- Highlight active route

**Test Plan**:
- **File**: `frontend/src/components/Sidebar.test.tsx`
- **TC-009-01**: Sidebar renders all navigation items
  - Given: Sidebar component
  - When: Rendered
  - Then: Home, Analytics, Billing, Settings links present
- **TC-009-02**: Active link highlighted
  - Given: Current route is /analytics
  - When: Sidebar rendered
  - Then: Analytics link has active styling

---

### T-010: Create header with user menu 💎
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending
**Depends On**: T-002

**Implementation**:
- Create `components/Header.tsx`
- Display user avatar and name
- Add logout button/dropdown

**Test Plan**:
- **File**: `frontend/src/components/Header.test.tsx`
- **TC-010-01**: Header shows user info
  - Given: User "John Doe" logged in
  - When: Header rendered
  - Then: "John Doe" displayed

---

### T-011: Implement Analytics page with charts 💎
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [ ] pending
**Depends On**: T-009, T-006

**Implementation**:
- Create `pages/AnalyticsPage.tsx`
- Create `components/KpiCard.tsx` for metrics display
- Create `components/UsageChart.tsx` (line chart) with Recharts
- Create `components/ComparisonChart.tsx` (bar chart)
- Add loading skeletons

**Test Plan**:
- **File**: `frontend/src/pages/AnalyticsPage.test.tsx`
- **TC-011-01**: KPI cards display data
  - Given: API returns { users: 150, revenue: 2500 }
  - When: AnalyticsPage rendered
  - Then: Cards show "150 Users", "$2,500 Revenue"
- **TC-011-02**: Loading state shows skeleton
  - Given: API request pending
  - When: AnalyticsPage rendered
  - Then: Skeleton placeholders visible

---

## Phase 4: Stripe Integration (US-003, US-004)

### T-012: Create pricing page 💎
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [ ] pending
**Depends On**: T-009

**Implementation**:
- Create `pages/PricingPage.tsx`
- Create `components/PricingCard.tsx`
- Display Free, Pro ($19/mo), Enterprise ($99/mo) tiers

**Test Plan**:
- **File**: `frontend/src/pages/PricingPage.test.tsx`
- **TC-012-01**: All pricing tiers displayed
  - Given: PricingPage rendered
  - When: Viewing page
  - Then: 3 cards visible with correct prices

---

### T-013: Implement Stripe Checkout flow 💎
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [ ] pending
**Depends On**: T-008, T-012

**Implementation**:
- Create `POST /api/checkout/create-session` endpoint in backend
- Create `services/stripe.ts` in frontend
- On "Subscribe" click → call API → redirect to Stripe Checkout
- Create `pages/CheckoutSuccess.tsx` and `pages/CheckoutCancel.tsx`

**Test Plan**:
- **File**: `frontend/src/services/stripe.test.ts`
- **TC-013-01**: Checkout session creation
  - Given: User clicks Subscribe on Pro plan
  - When: createCheckoutSession("price_pro") called
  - Then: Redirects to Stripe Checkout URL

---

### T-014: Implement billing/subscription management page 💎
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [ ] pending
**Depends On**: T-007, T-008

**Implementation**:
- Create `pages/BillingPage.tsx`
- Display current plan, next billing date, payment method
- Add "Manage Subscription" button → Stripe Customer Portal

**Test Plan**:
- **File**: `frontend/src/pages/BillingPage.test.tsx`
- **TC-014-01**: Subscription info displayed
  - Given: User has Pro subscription ending Jan 31
  - When: BillingPage rendered
  - Then: Shows "Pro Plan", "Next billing: Jan 31"

---

## Phase 5: Integration & Polish

### T-015: Connect frontend to backend API ⚡
**User Story**: All
**Status**: [ ] pending
**Depends On**: T-006, T-007, T-011

**Implementation**:
- Create `services/api.ts` with Axios instance
- Configure baseURL and JWT interceptor
- Wire up all API calls in pages

---

### T-016: Add JWT authentication middleware 💎
**User Story**: US-005
**Satisfies ACs**: AC-US5-04
**Status**: [ ] pending
**Depends On**: T-003

**Implementation**:
- Configure JWT Bearer auth in `Program.cs`
- Create mock login endpoint for testing
- Store JWT in httpOnly cookie

---

### T-017: End-to-end integration testing ⚡
**User Story**: All
**Status**: [ ] pending
**Depends On**: T-013, T-014, T-015

**Implementation**:
- Test full checkout flow with Stripe test cards
- Verify webhook updates subscription
- Confirm dashboard shows updated data

---

## Summary

| Phase | Tasks | Focus |
|-------|-------|-------|
| 1. Setup | T-001 to T-004 | Project initialization |
| 2. Backend | T-005 to T-008 | API + Webhooks |
| 3. Frontend | T-009 to T-011 | UI + Charts |
| 4. Stripe | T-012 to T-014 | Payments |
| 5. Polish | T-015 to T-017 | Integration |

**Total Tasks**: 17
**P1 User Stories**: US-001, US-002, US-003, US-005, US-006
**P2 User Stories**: US-004
