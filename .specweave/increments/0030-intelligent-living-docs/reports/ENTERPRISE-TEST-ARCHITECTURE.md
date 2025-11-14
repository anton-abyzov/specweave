# Enterprise Test Architecture - Best Practices

**Status**: Design Analysis
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**Question**: Where should different types of tests live in enterprise architectures?

**Answer**: It depends on the test type and organizational structure. There's no one-size-fits-all, but there are proven patterns.

**Enterprise Test Organization Patterns**:

| Test Type | Typical Location | Separate Repo? | Why? |
|-----------|------------------|----------------|------|
| **Unit Tests** | Same repo as code | ❌ No | Fast feedback, code ownership |
| **Integration Tests** | Same repo (usually) | ⚠️ Maybe | Depends on complexity |
| **Contract Tests** | Separate repo | ✅ Often | Shared between teams |
| **E2E Tests** | Separate repo | ✅ Yes | Cross-service, different lifecycle |
| **Performance Tests** | Separate repo | ✅ Yes | Different tools, long-running |
| **Security Tests** | Separate repo | ✅ Often | Specialized team/tools |
| **Acceptance Tests** | Separate repo | ⚠️ Maybe | Customer-facing, product owner driven |

**Key Principle**: Tests should live where they're **owned** and **executed** most frequently.

---

## Test Types - Deep Dive

### 1. Unit Tests ✅ Always in Codebase

**Location**: Same repository as the code being tested

**Pattern**:
```
backend/
├── src/
│   └── auth/
│       ├── login.ts              ← Code
│       └── login.test.ts         ← Unit test (co-located)
└── tests/
    └── unit/
        └── auth/
            └── login.test.ts     ← Alternative: centralized location
```

**Two Schools of Thought**:

**A. Co-located** (Recommended for TypeScript/JavaScript):
```
src/auth/
├── login.ts
└── login.test.ts        ← Test next to code
```

**Pros**:
- ✅ Easy to find tests (same folder as code)
- ✅ Clear ownership (change code → update test in same PR)
- ✅ Refactoring-friendly (move file → test moves with it)

**Cons**:
- ❌ Tests in production build (mitigated by build tools)
- ❌ Harder to see "all tests" at once

**B. Centralized** (Common in Java/C#):
```
src/auth/login.ts
tests/unit/auth/login.test.ts    ← Mirror structure
```

**Pros**:
- ✅ Clear separation (code vs tests)
- ✅ Easy to exclude from production builds
- ✅ Easy to see "all tests" at once

**Cons**:
- ❌ Harder to find tests (need to mirror folder structure)
- ❌ Can get out of sync (move file, forget to move test)

**Best Practice**: Co-located for dynamic languages (JS/TS/Python), centralized for compiled languages (Java/C#/Go)

**Why Always in Codebase?**
- ✅ **Fast feedback**: Run tests on every commit (CI/CD)
- ✅ **Code ownership**: Developer owns code AND tests
- ✅ **Atomic commits**: Code change + test change in one PR
- ✅ **No cross-repo dependencies**: Don't need to sync two repos

**Example**: SpecWeave
```
src/core/sync/status-mapper.ts
tests/unit/sync/status-mapper.test.ts    ← Same repo
```

---

### 2. Integration Tests ⚠️ Usually in Codebase

**Location**: Same repository (most common), sometimes separate

**Pattern A: Same Repo** (Recommended for most projects):
```
backend/
├── src/
│   └── auth/
│       └── login.ts
└── tests/
    ├── unit/
    │   └── auth/login.test.ts
    └── integration/
        └── auth/auth-flow.test.ts    ← Integration tests
```

**Pattern B: Separate Repo** (For complex microservices):
```
backend-repo/
└── src/auth/login.ts

integration-tests-repo/              ← Separate repository
└── auth/
    └── auth-flow.test.ts
```

**When to Use Same Repo**:
- ✅ Monolithic applications
- ✅ Single microservice with external dependencies (database, cache)
- ✅ Integration tests owned by same team
- ✅ Integration tests run on every commit

**When to Use Separate Repo**:
- ✅ Multiple microservices (cross-service integration)
- ✅ Integration tests owned by different team (QA team)
- ✅ Integration tests too slow for every commit (run nightly)
- ✅ Integration tests require complex infrastructure (multiple databases, message queues)

**Real-World Examples**:

**Example 1: Netflix** (Separate Repo)
- 100+ microservices
- Integration tests in separate repo (`integration-tests/`)
- Run nightly (too slow for every commit)
- Owned by QA/SRE team

**Example 2: Shopify** (Same Repo)
- Monolithic Rails application
- Integration tests in same repo (`test/integration/`)
- Run on every commit (CI/CD)
- Owned by feature teams

**Example 3: SpecWeave** (Same Repo - Recommended)
```
specweave/
├── src/
│   └── core/sync/status-mapper.ts
└── tests/
    ├── unit/
    │   └── sync/status-mapper.test.ts        ← Unit tests
    └── integration/
        └── sync/github-sync-integration.test.ts  ← Integration tests
```

**Why Same Repo for SpecWeave?**
- ✅ Single codebase (not microservices)
- ✅ Integration tests owned by core team
- ✅ Fast enough to run on every commit (<5 minutes)
- ✅ Atomic commits (API change + integration test in one PR)

---

### 3. Contract Tests ✅ Often Separate Repo

**Location**: Separate repository (shared between teams)

**What Are Contract Tests?**
- Tests that verify API contracts between services
- Consumer-driven (consumer defines what they need)
- Enables independent deployment

**Pattern**:
```
backend-api-repo/
└── src/api/users.ts

frontend-repo/
└── src/services/users-api.ts

contract-tests-repo/              ← Separate repository (shared)
├── consumers/
│   └── frontend/
│       └── users-api.contract.json    ← Frontend expectations
└── providers/
    └── backend/
        └── users-api.contract.test.ts ← Backend validates
```

**Why Separate Repo?**
- ✅ **Shared ownership**: Both frontend and backend teams
- ✅ **Version control**: Contract versions tracked separately
- ✅ **Independent deployment**: Consumer publishes contract → Provider validates

**Tools**: Pact, Spring Cloud Contract

**Real-World Example: Uber**
- 2000+ microservices
- Contract tests in separate repo (`api-contracts/`)
- Each service validates contracts on every deploy
- Prevents breaking changes

---

### 4. E2E Tests ✅ Always Separate Repo

**Location**: Separate repository (different lifecycle)

**What Are E2E Tests?**
- Tests that simulate real user flows (UI → API → Database)
- Cross-service (span multiple microservices)
- Browser-based (Playwright, Selenium, Cypress)

**Pattern**:
```
backend-repo/
└── src/api/

frontend-repo/
└── src/components/

e2e-tests-repo/                  ← Separate repository
└── tests/
    ├── auth/
    │   └── login.spec.ts        ← User login flow
    └── checkout/
        └── purchase.spec.ts     ← Checkout flow
```

**Why Always Separate Repo?**
- ✅ **Different lifecycle**: E2E tests run after deployment (staging/prod)
- ✅ **Different tools**: Playwright, Selenium (heavy dependencies)
- ✅ **Different team**: Often owned by QA team
- ✅ **Slower execution**: 30+ minutes (can't run on every commit)
- ✅ **Cross-service**: Spans frontend + backend + database
- ✅ **Environment-specific**: Different configs for staging/prod

**Real-World Examples**:

**Example 1: Airbnb**
- E2E tests in separate repo (`e2e-tests/`)
- Run on staging environment (after deployment)
- Owned by QA team
- 1000+ E2E tests, run in parallel (30 minutes)

**Example 2: Stripe**
- E2E tests in separate repo (`integration-tests/`)
- Run on production-like environment
- Owned by SRE team
- Tests critical user flows (payment processing)

**Example 3: SpecWeave** (Separate Folder, Same Repo - OK for Small Projects)
```
specweave/
├── src/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/                     ← E2E tests in separate folder
        └── specweave-smoke.spec.ts
```

**Why Same Repo for SpecWeave?**
- ⚠️ Small project (1 codebase, not microservices)
- ⚠️ E2E tests owned by core team (not separate QA team)
- ⚠️ Fast enough (<10 minutes)
- ⚠️ Simple setup (no complex infrastructure)

**When to Move to Separate Repo?**
- ✅ When E2E tests take >15 minutes
- ✅ When separate QA team owns E2E tests
- ✅ When E2E tests span multiple repositories
- ✅ When E2E tests need different deployment pipeline

---

### 5. Performance Tests ✅ Always Separate Repo

**Location**: Separate repository (different tools and lifecycle)

**What Are Performance Tests?**
- Load testing (1000+ concurrent users)
- Stress testing (break the system)
- Endurance testing (24-hour runs)

**Pattern**:
```
backend-repo/
└── src/api/

performance-tests-repo/          ← Separate repository
└── load-tests/
    ├── api-load.jmx            ← JMeter test
    ├── api-stress.js           ← k6 test
    └── reports/
```

**Why Always Separate Repo?**
- ✅ **Different tools**: JMeter, k6, Gatling (different tech stack)
- ✅ **Different team**: Often owned by performance engineering team
- ✅ **Long-running**: 1+ hours (can't run on every commit)
- ✅ **Expensive infrastructure**: Requires load generators, monitoring
- ✅ **Different schedule**: Run weekly/monthly (not on every commit)

**Real-World Example: Amazon**
- Performance tests in separate repo (`performance-tests/`)
- Run weekly on staging environment
- Owned by performance engineering team
- Tests with 100K+ concurrent users

---

### 6. Security Tests ✅ Often Separate Repo

**Location**: Separate repository (specialized tools)

**What Are Security Tests?**
- SAST (Static Application Security Testing)
- DAST (Dynamic Application Security Testing)
- Penetration tests
- Vulnerability scanning

**Pattern**:
```
backend-repo/
└── src/api/

security-tests-repo/             ← Separate repository
└── tests/
    ├── sast/
    │   └── sonarqube-config.yml
    ├── dast/
    │   └── zap-scan.js
    └── pentest/
        └── owasp-top10.test.ts
```

**Why Often Separate Repo?**
- ✅ **Specialized team**: Security team owns these tests
- ✅ **Different tools**: OWASP ZAP, Burp Suite, SonarQube
- ✅ **Sensitive data**: Security findings shouldn't be in main repo
- ✅ **Different schedule**: Run on demand (not every commit)

**Exception: SAST in Same Repo**
- SAST tools (SonarQube, ESLint security rules) often run on every commit
- Can be configured in same repo (`.sonarqube/`, `.eslintrc`)

**Real-World Example: Google**
- Security tests in separate repo (restricted access)
- Owned by security team
- Penetration tests run quarterly
- Findings tracked separately (not in public repo)

---

### 7. Acceptance Tests ⚠️ Maybe Separate Repo

**Location**: Separate repository (customer-facing tests)

**What Are Acceptance Tests?**
- Tests written in business language (Gherkin, Cucumber)
- Define acceptance criteria from product owner
- Often automated from BDD scenarios

**Pattern A: Separate Repo** (Large teams with dedicated QA):
```
backend-repo/
└── src/api/

acceptance-tests-repo/           ← Separate repository
└── features/
    ├── auth.feature            ← Gherkin scenarios
    └── checkout.feature
```

**Pattern B: Same Repo** (Small teams with embedded QA):
```
backend-repo/
├── src/api/
└── features/                   ← Acceptance tests in same repo
    ├── auth.feature
    └── checkout.feature
```

**When to Use Separate Repo**:
- ✅ Dedicated QA team owns acceptance tests
- ✅ Product owners/stakeholders edit acceptance tests directly
- ✅ Acceptance tests span multiple repositories

**When to Use Same Repo**:
- ✅ Developers write acceptance tests (TDD/BDD)
- ✅ Acceptance tests tied to specific codebase
- ✅ Small team (no dedicated QA)

**Real-World Example: Spotify** (Same Repo)
- Acceptance tests in same repo (`features/`)
- Written by developers (BDD approach)
- Run on every commit (CI/CD)

---

## Enterprise Patterns Summary

### Pattern 1: Monolithic Application (Small-Medium Team)

**Structure**:
```
my-app/                          ← Single repository
├── src/
│   └── auth/
│       ├── login.ts
│       └── login.test.ts        ← Unit tests (co-located)
└── tests/
    ├── integration/             ← Integration tests
    │   └── auth-flow.test.ts
    ├── e2e/                     ← E2E tests (same repo for now)
    │   └── login.spec.ts
    └── acceptance/              ← Acceptance tests (if using BDD)
        └── auth.feature
```

**Characteristics**:
- ✅ Everything in one repo (simpler)
- ✅ Single CI/CD pipeline
- ✅ Developers own all tests
- ✅ Fast feedback loop

**When to Use**:
- Small-medium team (<20 developers)
- Single codebase (monolithic app)
- Developers own testing (no dedicated QA)
- Tests run quickly (<10 minutes)

**Example**: SpecWeave (current state)

---

### Pattern 2: Microservices (Medium-Large Team)

**Structure**:
```
backend-api/                     ← Service repository
├── src/
│   └── auth/
│       ├── login.ts
│       └── login.test.ts        ← Unit tests
└── tests/
    └── integration/             ← Integration tests (API + DB)
        └── auth-flow.test.ts

frontend-web/                    ← Service repository
├── src/
│   └── components/
│       ├── Login.tsx
│       └── Login.test.tsx       ← Unit tests
└── tests/
    └── integration/             ← Integration tests (component + API)
        └── Login.integration.test.tsx

e2e-tests/                       ← Separate repository
└── tests/
    ├── auth/
    │   └── login.spec.ts        ← E2E tests (cross-service)
    └── checkout/
        └── purchase.spec.ts

performance-tests/               ← Separate repository
└── load-tests/
    └── api-load.jmx             ← Performance tests

contract-tests/                  ← Separate repository (optional)
└── consumers/
    └── frontend/
        └── users-api.contract.json
```

**Characteristics**:
- ✅ Multiple repositories (one per service)
- ✅ Unit + integration tests in each service repo
- ✅ E2E tests in separate repo (cross-service)
- ✅ Performance tests in separate repo (different team)
- ✅ Contract tests for API compatibility (optional)

**When to Use**:
- Medium-large team (20+ developers)
- Microservices architecture (multiple services)
- Dedicated QA/performance/security teams
- Tests span multiple services

**Example**: Netflix, Uber, Airbnb

---

### Pattern 3: Enterprise (Large Organization)

**Structure**:
```
product-backend/                 ← Service repository
├── src/
│   └── auth/
│       ├── login.ts
│       └── login.test.ts        ← Unit tests only
└── tests/
    └── integration/             ← Integration tests (minimal)
        └── auth-db.test.ts      ← Only DB integration

product-integration-tests/       ← Separate repository
└── tests/
    └── auth/
        └── auth-flow.test.ts    ← Cross-service integration

product-e2e-tests/               ← Separate repository
└── tests/
    └── auth/
        └── login.spec.ts        ← E2E tests

product-performance-tests/       ← Separate repository
└── load-tests/
    └── api-load.jmx

product-security-tests/          ← Separate repository (restricted)
└── pentest/
    └── owasp-top10.test.ts

product-acceptance-tests/        ← Separate repository
└── features/
    └── auth.feature             ← Gherkin scenarios
```

**Characteristics**:
- ✅ Multiple repositories (many services)
- ✅ Only unit tests in service repos
- ✅ All other tests in separate repos (different teams)
- ✅ Clear separation of concerns

**When to Use**:
- Large organization (100+ developers)
- Many microservices (50+)
- Dedicated teams (QA, performance, security)
- Complex testing requirements

**Example**: Amazon, Google, Microsoft

---

## Decision Matrix: Where Should My Tests Live?

### Quick Decision Tree

```
Is it a unit test?
├─ YES → Same repo as code (always!)
└─ NO → Continue...

Does it test a single service?
├─ YES → Same repo (integration tests)
└─ NO → Continue...

Does it span multiple services?
├─ YES → Separate repo (E2E, integration)
└─ NO → Continue...

Is it owned by a different team?
├─ YES → Separate repo (QA, security, performance)
└─ NO → Same repo

Does it run on every commit?
├─ YES → Same repo (fast feedback)
└─ NO → Separate repo (nightly/weekly tests)

Is it slow (>10 minutes)?
├─ YES → Separate repo (performance, E2E)
└─ NO → Same repo
```

### Detailed Decision Criteria

| Criteria | Same Repo | Separate Repo |
|----------|-----------|---------------|
| **Ownership** | Same team writes code + tests | Different team (QA, security) |
| **Execution Speed** | Fast (<10 min) | Slow (>10 min) |
| **Scope** | Single service | Multiple services |
| **Frequency** | Every commit | Nightly/weekly |
| **Tools** | Same tech stack | Different tech stack |
| **Dependencies** | Minimal (DB, cache) | Complex (many services) |
| **Feedback Loop** | Immediate (CI/CD) | Delayed (post-deployment) |

---

## SpecWeave Recommendations

### Current State (Correct)

```
specweave/
├── src/
│   └── core/
│       └── sync/
│           ├── status-mapper.ts
│           └── status-mapper.test.ts   ← ❌ Consider moving
└── tests/
    ├── unit/
    │   └── sync/
    │       └── status-mapper.test.ts   ← ✅ Centralized location
    ├── integration/
    │   └── sync/
    │       └── github-sync.test.ts     ← ✅ Same repo (correct)
    └── e2e/
        └── specweave-smoke.spec.ts     ← ⚠️ OK for now, move later
```

### Recommendation 1: Consolidate Unit Tests

**Current**: Some unit tests co-located, some centralized

**Recommendation**: Choose one pattern consistently

**Option A: Co-located** (Recommended for SpecWeave):
```
src/core/sync/
├── status-mapper.ts
└── status-mapper.test.ts        ← Test next to code
```

**Why?**
- ✅ Easier to find tests (same folder)
- ✅ TypeScript/JavaScript convention
- ✅ Simpler refactoring (move file → test moves)

**Option B: Centralized** (Current partial state):
```
src/core/sync/status-mapper.ts
tests/unit/sync/status-mapper.test.ts    ← Mirror structure
```

**Why?**
- ✅ Clear separation (code vs tests)
- ✅ Matches Java/C# conventions
- ✅ Current partial state (less churn)

**My Recommendation**: Go with **centralized** (Option B) since SpecWeave already has `tests/` structure. Consistent with current architecture.

### Recommendation 2: Keep Integration Tests in Same Repo

**Current**: ✅ Already correct!

```
tests/integration/
├── sync/
│   ├── github-sync.test.ts      ← Tests GitHub API integration
│   ├── jira-sync.test.ts        ← Tests JIRA API integration
│   └── ado-sync.test.ts         ← Tests ADO API integration
└── brownfield/
    └── notion-import.test.ts    ← Tests Notion import
```

**Why Keep in Same Repo?**
- ✅ Single codebase (not microservices)
- ✅ Owned by core team
- ✅ Fast enough (<5 minutes)
- ✅ External APIs mocked (not real GitHub/JIRA)

### Recommendation 3: Move E2E Tests to Separate Repo (When Needed)

**Current**: E2E tests in same repo (OK for now)

**When to Move**:
- ✅ When E2E tests take >15 minutes
- ✅ When SpecWeave becomes multiple services (CLI + web app + API)
- ✅ When dedicated QA team owns E2E tests
- ✅ When E2E tests need different infrastructure (staging environment)

**Future Structure**:
```
specweave/                       ← Main repository
└── tests/
    ├── unit/
    └── integration/

specweave-e2e-tests/             ← Separate repository (future)
└── tests/
    ├── cli/
    │   └── increment-workflow.spec.ts
    └── web/
        └── dashboard.spec.ts
```

### Recommendation 4: Add Performance Tests (Separate Repo)

**Not Yet Implemented**: Performance tests

**Future Structure**:
```
specweave-performance-tests/     ← Separate repository (future)
└── load-tests/
    ├── increment-creation.jmx   ← Load test (100 increments/sec)
    └── living-docs-sync.k6.js   ← Stress test (1000 docs)
```

**Why Separate Repo?**
- ✅ Different tools (JMeter, k6)
- ✅ Long-running (1+ hours)
- ✅ Expensive infrastructure (load generators)
- ✅ Different team (performance engineering)

---

## Best Practices Summary

### Do's ✅

1. **Unit Tests**: Always in same repo (co-located or centralized)
2. **Integration Tests**: Same repo if single service, separate if cross-service
3. **E2E Tests**: Separate repo if slow (>15 min) or cross-service
4. **Performance Tests**: Always separate repo (different tools/team)
5. **Security Tests**: Separate repo (sensitive data, specialized team)
6. **Contract Tests**: Separate repo (shared between teams)

### Don'ts ❌

1. **Don't mix test types in same folder**: Keep unit/integration/e2e separate
2. **Don't put tests in production build**: Use build tools to exclude tests
3. **Don't put slow tests in main repo**: Move to separate repo (breaks CI/CD)
4. **Don't put sensitive tests in public repo**: Security tests should be restricted

### Key Principle

**Tests should live where they're owned and executed most frequently.**

- ✅ **Same Repo**: Fast feedback, atomic commits, single ownership
- ✅ **Separate Repo**: Different team, different tools, different lifecycle

---

## SpecWeave-Specific Guidance

### For Contributors (Internal Tests)

**Unit Tests**:
- Location: `tests/unit/` (centralized, mirror `src/` structure)
- Run on: Every commit (CI/CD)
- Coverage: 90%+

**Integration Tests**:
- Location: `tests/integration/` (same repo)
- Run on: Every commit (CI/CD)
- Coverage: 85%+
- Mock external APIs (GitHub, JIRA, ADO)

**E2E Tests**:
- Location: `tests/e2e/` (same repo for now)
- Run on: Every commit (CI/CD)
- Coverage: 80%+
- Use Playwright

### For Users (External Tests)

**User Project Tests**:
```
my-saas-app/                     ← User's project
├── src/
└── tests/
    ├── unit/
    │   └── auth.test.ts         ← User's unit tests
    ├── integration/
    │   └── api.test.ts          ← User's integration tests
    └── e2e/
        └── app.spec.ts          ← User's E2E tests
```

**SpecWeave's Guidance** (in docs):
- ✅ Unit tests: Same repo (always)
- ✅ Integration tests: Same repo (if single service)
- ⚠️ E2E tests: Separate repo (if >15 min or cross-service)
- ✅ Performance tests: Separate repo (always)

---

## Conclusion

**Core Insights**:

1. **Unit Tests**: Always in same repo (co-located or centralized)
2. **Integration Tests**: Same repo for single service, separate for cross-service
3. **E2E Tests**: Separate repo if slow or cross-service
4. **Performance Tests**: Always separate repo
5. **Security Tests**: Usually separate repo
6. **Contract Tests**: Separate repo (shared)

**SpecWeave Current State**: ✅ Mostly correct!
- Unit tests: `tests/unit/` (centralized)
- Integration tests: `tests/integration/` (same repo)
- E2E tests: `tests/e2e/` (same repo for now, move later if needed)

**Future State**:
- Consider moving E2E tests to separate repo when they get slow (>15 min)
- Add performance tests in separate repo (`specweave-performance-tests/`)

---

**Status**: ✅ Ready for Review
**Next Steps**:
1. Review and approve recommendations
2. Update CLAUDE.md with test organization guidance
3. Document for contributors and users

---

**Approvers**: SpecWeave Core Team
**Date**: 2025-11-13
