---
sidebar_position: 5
---

# Tasks.md

**Category**: SpecWeave Core

## Definition

**tasks.md** is a structured task file in every SpecWeave increment that contains:
1. **Tasks**: Actionable implementation steps
2. **Embedded Test Plans**: BDD-format test specifications (Given/When/Then)
3. **AC-ID Traceability**: Links to acceptance criteria from spec.md
4. **Coverage Targets**: Realistic test coverage goals (80-90%)

**Key Innovation**: Tests are EMBEDDED in tasks (not a separate tests.md file), ensuring single source of truth.

## What Problem Does It Solve?

**The Old Way** (Separate tests.md file):
- ❌ Duplication (tasks.md + tests.md describe same work)
- ❌ Sync issues (tasks updated, tests forgotten)
- ❌ Manual TC-ID management (TC-001, TC-002, etc.)
- ❌ No BDD format (hard to understand test intent)
- ❌ Tests disconnected from tasks (traceability gaps)

**The SpecWeave Way** (Embedded in tasks.md):
- ✅ Single source of truth (task + tests together)
- ✅ Automatic sync (can't forget to update tests)
- ✅ AC-ID traceability (spec.md → tasks.md → tests)
- ✅ BDD format (Given/When/Then - clear intent)
- ✅ Test-first workflow (TDD supported naturally)
- ✅ Coverage targets per task (realistic 80-90%, not 100%)

## Structure

```markdown
---
increment: 0008-user-authentication
total_tasks: 5
test_mode: TDD
coverage_target: 85%
---

# Tasks for Increment 0008: User Authentication

## T-001: Implement Authentication Service

**AC**: AC-US1-01, AC-US1-02, AC-US1-03

**Test Plan** (BDD format):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token + timestamp update
- **Given** user with invalid password → **When** login → **Then** show error "Invalid credentials"
- **Given** user with 5 failed attempts → **When** login → **Then** account locked 15min

**Test Cases**:
- **Unit** (`auth.test.ts`):
  - validLogin() - Happy path
  - invalidPassword() - Error handling
  - nonexistentUser() - Edge case
  - rateLimiting() - Security
  - **Coverage**: 90% (statement + branch)

- **Integration** (`auth-flow.test.ts`):
  - loginEndpoint() - E2E login flow
  - lockedAccount() - Rate limit behavior
  - **Coverage**: 85%

- **Overall**: 87% coverage

**Implementation**:
1. Create AuthService.ts with login() method
2. Implement password hashing (bcrypt, cost factor: 10)
3. Implement JWT generation (15min access, 7d refresh)
4. Implement rate limiting (Redis-based, 5 attempts/15min)
5. Write tests FIRST (TDD red-green-refactor)

**Dependencies**: None
**Estimated Time**: 8 hours

---

## T-002: Implement Session Management

**AC**: AC-US2-01, AC-US2-02

**Test Plan** (BDD format):
- **Given** valid JWT token → **When** validate → **Then** session active
- **Given** expired token → **When** validate → **Then** return 401
- **Given** refresh token → **When** refresh → **Then** get new access token

**Test Cases**:
- **Unit** (`session.test.ts`):
  - validateToken() - Token validation
  - refreshToken() - Token refresh
  - **Coverage**: 85%

- **Integration** (`session-flow.test.ts`):
  - fullSessionLifecycle() - End-to-end session flow
  - **Coverage**: 80%

- **Overall**: 83% coverage

**Implementation**:
1. Create SessionManager.ts
2. Implement token validation
3. Implement token refresh logic
4. Implement "Remember Me" functionality

**Dependencies**: T-001 (Authentication Service)
**Estimated Time**: 6 hours

---

[... T-003 through T-005]
```

## YAML Frontmatter

**Required Fields**:

```yaml
---
increment: 0008-user-authentication   # Increment ID
total_tasks: 5                        # Number of tasks
test_mode: TDD                        # TDD | Standard
coverage_target: 85%                  # Overall coverage goal
---
```

**Fields**:
- `increment`: Increment ID (e.g., "0008-user-authentication")
- `total_tasks`: Total number of tasks
- `test_mode`: `TDD` (test-first) or `Standard` (tests alongside code)
- `coverage_target`: Overall coverage goal (typically 80-90%)

## Task Structure

Each task contains:

### 1. **AC-ID Links**
```markdown
**AC**: AC-US1-01, AC-US1-02, AC-US1-03
```
Links to acceptance criteria from spec.md

### 2. **Test Plan (BDD Format)**
```markdown
**Test Plan** (BDD format):
- **Given** user with valid credentials → **When** login → **Then** receive JWT token
- **Given** user with invalid password → **When** login → **Then** show error
- **Given** user with 5 failed attempts → **When** login → **Then** account locked 15min
```

Behavior-driven scenarios (Given/When/Then)

### 3. **Test Cases**
```markdown
**Test Cases**:
- **Unit** (`auth.test.ts`):
  - validLogin() - Happy path
  - invalidPassword() - Error handling
  - nonexistentUser() - Edge case
  - rateLimiting() - Security
  - **Coverage**: 90%

- **Integration** (`auth-flow.test.ts`):
  - loginEndpoint() - E2E login flow
  - lockedAccount() - Rate limit behavior
  - **Coverage**: 85%

- **Overall**: 87% coverage
```

Specific test functions with coverage targets

### 4. **Implementation Steps**
```markdown
**Implementation**:
1. Create AuthService.ts with login() method
2. Implement password hashing (bcrypt)
3. Implement JWT generation
4. Implement rate limiting
5. Write tests FIRST (TDD)
```

Actionable steps for developers

### 5. **Dependencies & Time**
```markdown
**Dependencies**: T-001, T-002
**Estimated Time**: 8 hours
```

Task dependencies and effort estimation

## AC-ID Format

**Format**: `AC-US{story}-{number}`

**Examples**:
- `AC-US1-01` - User Story 1, Acceptance Criterion 1
- `AC-US1-02` - User Story 1, Acceptance Criterion 2
- `AC-US2-01` - User Story 2, Acceptance Criterion 1

**Traceability**:
```
spec.md:
  US-001: Basic Login Flow
    - AC-US1-01: User can log in with email/password
    - AC-US1-02: Invalid credentials show error
    - AC-US1-03: 5 failed attempts lock account

tasks.md:
  T-001: Implement Authentication Service
    AC: AC-US1-01, AC-US1-02, AC-US1-03
    [Test plans for each AC-ID]
```

## TDD Workflow Mode

When `test_mode: TDD` in frontmatter:

**Red → Green → Refactor**:
1. **Red**: Write failing test first
2. **Green**: Implement minimal code to pass test
3. **Refactor**: Improve code while keeping tests green

**Example**:
```bash
# 1. RED - Write failing test
vim tests/unit/services/auth.test.ts
npm test  # ❌ Fails (expected)

# 2. GREEN - Implement feature
vim src/services/auth/AuthService.ts
npm test  # ✅ Passes

# 3. REFACTOR - Improve code
vim src/services/auth/AuthService.ts
npm test  # ✅ Still passes
```

## Coverage Targets

**Realistic Goals** (SpecWeave philosophy):

| Layer | Target | Why |
|-------|--------|-----|
| **Unit** | 85-90% | Core logic coverage |
| **Integration** | 80-85% | Key integration points |
| **E2E** | 100% | Critical user paths only |
| **Overall** | 80-90% | Balanced (not 100%!) |

**Why NOT 100%?**
- Diminishing returns (last 10% takes 50% of effort)
- Some code is untestable (third-party libraries)
- Focus on critical paths, not perfection

## Agent Invocation

The `increment-planner` skill automatically invokes the `test-aware-planner` agent:

```markdown
Task(
  subagent_type: "test-aware-planner",
  description: "Generate tasks with embedded tests",
  prompt: "Create tasks.md with embedded test plans for: [feature]

  FIRST, read the increment files:
  - .specweave/increments/0008-user-authentication/spec.md
  - .specweave/increments/0008-user-authentication/plan.md

  Generate tasks.md with:
  - Test Plan (Given/When/Then in BDD format)
  - Test Cases (unit/integration/E2E with file paths)
  - Coverage Targets (80-90% overall)
  - Implementation steps
  - Ensure all AC-IDs from spec.md are covered"
)
```

## Validation

```bash
# Validate test coverage for increment
/specweave:check-tests 0008

# Output:
# ✅ All AC-IDs covered
# ✅ Overall coverage: 87% (target: 85%)
# ✅ Test plans present for all tasks
# ⚠️ T-003: Consider edge case for rate limiting
```

## Best Practices

### 1. **Write Test Plans First**
- ✅ BDD format before implementation
- ✅ Clear Given/When/Then scenarios
- ❌ Don't write implementation before tests

### 2. **Use Realistic Coverage Targets**
- ✅ 80-90% overall (balanced)
- ✅ 100% for critical paths only
- ❌ Don't aim for 100% everywhere (waste of time)

### 3. **Link All AC-IDs**
- ✅ Every task must reference AC-IDs
- ✅ Ensures spec → tasks → tests traceability
- ❌ Don't create tasks without AC-IDs

### 4. **Keep Tasks Focused**
- ✅ One service/component per task
- ✅ 4-8 hours per task
- ❌ Don't create mega-tasks (>16 hours)

## Common Patterns

### Multi-Layer Testing
```markdown
**Test Cases**:
- **Unit** (`auth.test.ts`): Pure logic testing
- **Integration** (`auth-flow.test.ts`): API + DB testing
- **E2E** (`login-flow.spec.ts`): Browser automation
```

### TDD Red-Green-Refactor
```markdown
**Implementation** (TDD):
1. Write failing test (RED)
2. Implement minimal code (GREEN)
3. Refactor while keeping tests green (REFACTOR)
```

### Edge Case Coverage
```markdown
**Test Plan**:
- **Given** valid input → **When** process → **Then** success (happy path)
- **Given** invalid input → **When** process → **Then** error (edge case)
- **Given** missing input → **When** process → **Then** validation error (edge case)
```

## Related Terms

- [SpecWeave](./specweave.md) - The framework
- [Increment](./increment.md) - Unit of work
- [Spec](./spec.md) - Specification document
- [AC-ID](./ac-id.md) - Acceptance Criteria ID
- [BDD](./bdd.md) - Behavior-Driven Development
- [TDD](./tdd.md) - Test-Driven Development

## Learn More

- [Test-Aware Planning](/docs/workflows/planning#test-aware-planning)
- [TDD Workflow](/docs/workflows/implementation#tdd-workflow)
- [Quality Validation](/docs/commands/overview#quality-assurance-commands)
