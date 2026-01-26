---
increment: 0176-react-dashboard-stripe-checkout
status: planned
testMode: TDD
phases:
  - scaffolding
  - backend-foundation
  - authentication
  - dashboard
  - payments
  - subscriptions
estimated_tasks: 48
---

# Implementation Tasks

## Phase 1: Project Scaffolding

### T-001: [RED] Write scaffolding validation tests
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given empty project folder → When scaffolding complete → Then React project compiles without errors
- Given empty project folder → When scaffolding complete → Then .NET project builds successfully
- Given empty project folder → When scaffolding complete → Then Tailwind classes work

**Guidance**:
- Write validation script that checks project structure
- Test compilation/build success
- Test Tailwind CSS processing

---

### T-002: [GREEN] Create React frontend with Vite + TypeScript
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-001

**Implementation**:
```bash
cd ~/Projects/react-dash-stripe
mkdir frontend && cd frontend
npm create vite@latest . -- --template react-ts
npm install tailwindcss postcss autoprefixer
npm install recharts @tanstack/react-query zustand react-router-dom
npm install react-hook-form zod @hookform/resolvers
npm install @stripe/stripe-js
npx tailwindcss init -p
```

**Test**: T-001 tests pass

---

### T-003: [GREEN] Create .NET 8 Web API project
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-001

**Implementation**:
```bash
cd ~/Projects/react-dash-stripe
mkdir backend && cd backend
dotnet new sln -n DashboardApi
dotnet new webapi -n DashboardApi -o src/DashboardApi
dotnet new xunit -n DashboardApi.Tests -o tests/DashboardApi.Tests
dotnet sln add src/DashboardApi tests/DashboardApi.Tests
cd src/DashboardApi
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Stripe.net
dotnet add package FluentValidation.AspNetCore
dotnet add package Serilog.AspNetCore
```

**Test**: T-001 tests pass

---

### T-004: [GREEN] Create Docker Compose for PostgreSQL
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-001

**Implementation**: Create docker-compose.yml with PostgreSQL 16

**Test**: `docker-compose up postgres` starts successfully

---

### T-005: [REFACTOR] Configure linting and formatting
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: haiku
**Depends On**: T-002, T-003

**Implementation**:
- ESLint + Prettier for frontend
- .editorconfig for both
- Pre-commit hooks with husky

---

## Phase 2: Backend Foundation

### T-006: [RED] Write API structure tests
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given repository interface → When implemented → Then CRUD operations work
- Given service layer → When called → Then business logic executes
- Given controller → When endpoint hit → Then returns proper DTO

---

### T-007: [GREEN] Implement repository pattern
**User Story**: US-008
**Satisfies ACs**: AC-US8-01
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-006

**Implementation**:
- IRepository<T> interface
- BaseRepository<T> implementation
- UserRepository, OrderRepository, SubscriptionRepository

---

### T-008: [GREEN] Implement service layer
**User Story**: US-008
**Satisfies ACs**: AC-US8-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-006, T-007

**Implementation**:
- IAuthService, IPaymentService, IAnalyticsService
- Inject repositories into services
- Business logic separation

---

### T-009: [GREEN] Create DTOs and mappings
**User Story**: US-008
**Satisfies ACs**: AC-US8-03
**Status**: [ ] pending
**Phase**: GREEN
**Model**: haiku
**Depends On**: T-006

**Implementation**:
- Request/Response DTOs for each endpoint
- AutoMapper or manual mapping

---

### T-010: [GREEN] Add global exception handling
**User Story**: US-008
**Satisfies ACs**: AC-US8-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-006

**Implementation**:
- ExceptionHandlingMiddleware
- ProblemDetails responses
- Logging of exceptions

---

### T-011: [GREEN] Add request logging
**User Story**: US-008
**Satisfies ACs**: AC-US8-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: haiku
**Depends On**: T-006

**Implementation**:
- Serilog configuration
- Request/response logging middleware
- Correlation IDs

---

### T-012: [GREEN] Configure Swagger
**User Story**: US-008
**Satisfies ACs**: AC-US8-06
**Status**: [ ] pending
**Phase**: GREEN
**Model**: haiku
**Depends On**: T-006

**Implementation**:
- Swashbuckle configuration
- JWT bearer authentication in Swagger
- XML documentation comments

---

### T-013: [REFACTOR] Clean up backend structure
**User Story**: US-008
**Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-007, T-008, T-009, T-010, T-011, T-012

---

## Phase 3: Authentication

### T-014: [RED] Write authentication tests
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given valid credentials → When login → Then JWT returned
- Given invalid credentials → When login → Then 401 returned
- Given valid registration data → When register → Then user created
- Given expired token → When accessing protected route → Then 401 returned

---

### T-015: [GREEN] Implement JWT authentication backend
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-06
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-014

**Implementation**:
- JWT configuration in Program.cs
- AuthService with login, register, refresh
- Password hashing with BCrypt
- Refresh token storage and rotation

---

### T-016: [GREEN] Create auth API endpoints
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-014, T-015

**Implementation**:
- AuthController with /register, /login, /refresh, /forgot-password, /reset-password
- Request validation with FluentValidation

---

### T-017: [GREEN] Create React login page
**User Story**: US-004
**Satisfies ACs**: AC-US4-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-014

**Implementation**:
- Login form with react-hook-form
- Zod validation schema
- Auth service API calls
- Token storage in memory/httpOnly cookies

---

### T-018: [GREEN] Create React registration page
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-014

**Implementation**:
- Registration form with validation
- Password strength indicator
- Terms acceptance checkbox

---

### T-019: [GREEN] Implement protected routes
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-014, T-017

**Implementation**:
- AuthProvider context
- ProtectedRoute component
- Automatic token refresh
- Redirect to login on 401

---

### T-020: [REFACTOR] Clean up auth implementation
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-015, T-016, T-017, T-018, T-019

---

## Phase 4: Dashboard UI

### T-021: [RED] Write dashboard layout tests
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given dashboard page → When rendered → Then sidebar visible
- Given mobile viewport → When hamburger clicked → Then menu opens
- Given dark mode toggle → When clicked → Then theme changes

---

### T-022: [GREEN] Create responsive sidebar
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-021

**Implementation**:
- Collapsible sidebar with icons
- Navigation links
- Mobile drawer variant

---

### T-023: [GREEN] Create header with user profile
**User Story**: US-002
**Satisfies ACs**: AC-US2-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-021

**Implementation**:
- Top header bar
- User avatar and dropdown
- Logout button

---

### T-024: [GREEN] Create main content area
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [ ] pending
**Phase**: GREEN
**Model**: haiku
**Depends On**: T-021

**Implementation**:
- Breadcrumb navigation
- Content container with proper spacing

---

### T-025: [GREEN] Implement dark mode
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-021

**Implementation**:
- Theme store with Zustand
- CSS variables for colors
- System preference detection
- LocalStorage persistence

---

### T-026: [REFACTOR] Polish dashboard layout
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-022, T-023, T-024, T-025

---

### T-027: [RED] Write analytics chart tests
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given dashboard data → When rendered → Then KPI cards show values
- Given revenue data → When chart rendered → Then line chart displays
- Given API endpoint → When called → Then returns chart data

---

### T-028: [GREEN] Create KPI cards component
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-027

**Implementation**:
- StatCard component with icon, value, label, trend
- Grid layout for 4 KPIs

---

### T-029: [GREEN] Create revenue line chart
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-027

**Implementation**:
- Recharts LineChart wrapper
- Date range selector (daily/weekly/monthly)
- Responsive container

---

### T-030: [GREEN] Create sales bar chart
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-027

**Implementation**:
- Recharts BarChart for categories
- Tooltips and legends

---

### T-031: [GREEN] Create traffic pie chart
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-027

**Implementation**:
- Recharts PieChart
- Labels and percentages

---

### T-032: [GREEN] Create dashboard API endpoints
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-027

**Implementation**:
- DashboardController with /stats, /revenue, /sales
- Analytics service with data aggregation
- Sample data seeding

---

### T-033: [GREEN] Implement data refresh
**User Story**: US-003
**Satisfies ACs**: AC-US3-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-027, T-032

**Implementation**:
- TanStack Query with refetch intervals
- Manual refresh button
- Loading states

---

### T-034: [REFACTOR] Polish analytics dashboard
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-028, T-029, T-030, T-031, T-032, T-033

---

## Phase 5: Stripe Checkout

### T-035: [RED] Write checkout tests
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given product selection → When checkout initiated → Then Stripe session created
- Given successful payment → When redirected → Then success page shows
- Given cancelled payment → When redirected → Then cancel page shows

---

### T-036: [GREEN] Configure Stripe SDK in backend
**User Story**: US-005
**Satisfies ACs**: AC-US5-01
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-035

**Implementation**:
- Stripe.net configuration
- API key from environment
- StripeClient singleton

---

### T-037: [GREEN] Create checkout session endpoint
**User Story**: US-005
**Satisfies ACs**: AC-US5-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-035, T-036

**Implementation**:
- POST /api/payments/checkout
- Create Stripe checkout session
- Return session URL
- Store pending order

---

### T-038: [GREEN] Create React checkout button
**User Story**: US-005
**Satisfies ACs**: AC-US5-03
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-035

**Implementation**:
- CheckoutButton component
- Stripe.js redirect
- Loading state

---

### T-039: [GREEN] Create success/cancel pages
**User Story**: US-005
**Satisfies ACs**: AC-US5-04, AC-US5-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-035

**Implementation**:
- /checkout/success page with order confirmation
- /checkout/cancel page with retry option
- Query param handling for session_id

---

### T-040: [REFACTOR] Polish checkout flow
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-036, T-037, T-038, T-039

---

## Phase 6: Webhooks

### T-041: [RED] Write webhook tests
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given valid signature → When webhook received → Then event processed
- Given invalid signature → When webhook received → Then 400 returned
- Given checkout.session.completed → When processed → Then order updated
- Given duplicate event → When processed → Then idempotent handling

---

### T-042: [GREEN] Create webhook endpoint with signature verification
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-041

**Implementation**:
- POST /api/webhooks/stripe
- Stripe signature verification
- Raw body handling

---

### T-043: [GREEN] Handle checkout events
**User Story**: US-006
**Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-041, T-042

**Implementation**:
- Event type routing
- checkout.session.completed → update order
- payment_intent.succeeded → confirm payment
- payment_intent.failed → mark failed

---

### T-044: [GREEN] Implement idempotency
**User Story**: US-006
**Satisfies ACs**: AC-US6-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-041

**Implementation**:
- Store processed event IDs
- Skip duplicate events
- Transaction handling

---

### T-045: [GREEN] Add webhook logging
**User Story**: US-006
**Satisfies ACs**: AC-US6-06
**Status**: [ ] pending
**Phase**: GREEN
**Model**: haiku
**Depends On**: T-041

**Implementation**:
- Log all webhook events
- Log processing results
- Error logging with details

---

### T-046: [REFACTOR] Clean up webhook handling
**User Story**: US-006
**Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-042, T-043, T-044, T-045

---

## Phase 7: Subscriptions

### T-047: [RED] Write subscription tests
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03
**Status**: [ ] pending
**Phase**: RED
**Model**: opus

**Test**:
- Given plans endpoint → When called → Then plans returned
- Given subscription creation → When completed → Then subscription active
- Given active subscription → When cancelled → Then status updated

---

### T-048: [GREEN] Create subscription plans display
**User Story**: US-007
**Satisfies ACs**: AC-US7-01
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-047

**Implementation**:
- PricingCard component
- Plans grid layout
- Feature comparison

---

### T-049: [GREEN] Implement subscription creation
**User Story**: US-007
**Satisfies ACs**: AC-US7-02
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-047

**Implementation**:
- POST /api/subscriptions endpoint
- Stripe subscription creation
- Customer creation if needed

---

### T-050: [GREEN] Display subscription status
**User Story**: US-007
**Satisfies ACs**: AC-US7-03, AC-US7-06
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-047

**Implementation**:
- Subscription status card
- Current plan display
- Next billing date
- Invoice history list

---

### T-051: [GREEN] Implement subscription cancellation
**User Story**: US-007
**Satisfies ACs**: AC-US7-04
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-047

**Implementation**:
- DELETE /api/subscriptions/{id}
- Stripe cancellation
- Confirmation modal

---

### T-052: [GREEN] Implement plan changes
**User Story**: US-007
**Satisfies ACs**: AC-US7-05
**Status**: [ ] pending
**Phase**: GREEN
**Model**: opus
**Depends On**: T-047

**Implementation**:
- PUT /api/subscriptions/{id}
- Stripe subscription update
- Proration handling

---

### T-053: [REFACTOR] Polish subscription management
**User Story**: US-007
**Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06
**Status**: [ ] pending
**Phase**: REFACTOR
**Model**: opus
**Depends On**: T-048, T-049, T-050, T-051, T-052

---

## Summary

| Phase | Tasks | Status |
|-------|-------|--------|
| Scaffolding | T-001 to T-005 | [ ] pending |
| Backend Foundation | T-006 to T-013 | [ ] pending |
| Authentication | T-014 to T-020 | [ ] pending |
| Dashboard UI | T-021 to T-034 | [ ] pending |
| Stripe Checkout | T-035 to T-040 | [ ] pending |
| Webhooks | T-041 to T-046 | [ ] pending |
| Subscriptions | T-047 to T-053 | [ ] pending |

**Total Tasks**: 53
**TDD Mode**: Active (RED-GREEN-REFACTOR)
**Coverage Target**: 90%
