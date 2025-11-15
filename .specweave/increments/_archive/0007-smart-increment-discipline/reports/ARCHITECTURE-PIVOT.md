# Architecture Pivot: Eliminate tests.md

**Date**: 2025-11-04
**Decision**: Eliminate tests.md, embed test plans directly in tasks.md
**Rationale**: Simpler, industry-aligned, single source of truth
**Impact**: v0.7.0 delivers both parts, timeline compressed to hours

---

## The Problem with tests.md

### Current Architecture (OLD):

```
.specweave/increments/####/
├── spec.md      # WHAT/WHY (user stories, AC-IDs)
├── plan.md      # HOW (architecture)
├── tasks.md     # STEPS (implementation tasks)
└── tests.md     # VERIFY (test cases, TC-IDs)
```

### Issues:

1. **Duplication**: AC → TC mapping exists in BOTH tasks.md and tests.md
2. **Sync burden**: Update tasks.md → must update tests.md → easy to forget
3. **Unnecessary abstraction**: TC-IDs (TC-001, TC-002) add no value over inline test plans
4. **Not industry standard**: Nobody else uses separate test spec files
5. **Complexity**: test-aware-planner must generate TWO files and keep them in sync

---

## The New Architecture (SIMPLIFIED):

### File Structure:

```
.specweave/increments/####/
├── spec.md      # WHAT/WHY (user stories with AC-IDs)
├── plan.md      # HOW (architecture + test strategy overview)
└── tasks.md     # STEPS + VERIFY (tasks with embedded test plans)
```

### Benefits:

1. ✅ **Single source of truth** - Task defines what to do AND how to verify
2. ✅ **Industry alignment** - BDD (Given/When/Then), Agile (AC in stories)
3. ✅ **Less maintenance** - One file to update
4. ✅ **Clearer workflow** - "Complete T-001 = implement + pass these tests"
5. ✅ **Simpler agents** - test-aware-planner generates ONE file

---

## Task Format (NEW - With Embedded Tests)

### Example Task:

```markdown
### T-001: Implement User Authentication

**User Story**: US1
**Acceptance Criteria**: AC-US1-01 (login), AC-US1-02 (logout)
**Priority**: P1
**Estimate**: 4 hours
**Status**: pending

**Test Plan**:
- **Given** a registered user with email "test@example.com"
- **When** they submit valid credentials
- **Then** they should be redirected to dashboard
- **And** session cookie should be created with 30-minute expiry

**Test Cases**:
1. **Unit**: `tests/unit/auth.test.ts`
   - `testValidLogin()`: Valid credentials → success
   - `testInvalidLogin()`: Invalid credentials → error
   - `testSessionCreation()`: Session cookie created
   - **Coverage Target**: 90%

2. **Integration**: `tests/integration/auth-flow.test.ts`
   - `testFullLoginFlow()`: Login → dashboard redirect
   - `testLogoutFlow()`: Logout → session destroyed
   - **Coverage Target**: 85%

3. **E2E**: `tests/e2e/authentication.spec.ts`
   - `userCanLogin()`: Browser test, full flow
   - **Coverage Target**: 100% (critical path)

**Overall Coverage Target**: 85-90%

**Implementation**:
1. Create `src/auth/authenticate.ts`
2. Implement `validateCredentials(email, password)`
3. Implement `createSession(userId, expiryMinutes)`
4. Add error handling for invalid credentials
5. Run unit tests (should pass: 3/3)
6. Run integration tests (should pass: 2/2)
7. Run E2E tests (should pass: 1/1)

**TDD Workflow** (if TDD mode enabled):
1. 📝 Write all 6 tests above (should fail)
2. ❌ Run tests: `npm test auth` (0/6 passing)
3. ✅ Implement authentication (step-by-step)
4. 🟢 Run tests: `npm test auth` (6/6 passing)
5. ♻️ Refactor if needed
6. ✅ Final check: Coverage ≥85%

**Non-testable tasks** (documentation, config):

### T-010: Update README.md

**User Story**: US3
**Acceptance Criteria**: AC-US3-05 (documentation)
**Priority**: P2
**Estimate**: 1 hour
**Status**: pending

**Test Plan**: N/A (documentation task)

**Validation**:
- Manual review: Grammar, clarity, completeness
- Link checker: All links work
- Build check: Docusaurus builds without errors

**Implementation**:
1. Update installation section
2. Add authentication examples
3. Update API reference
4. Run link checker
5. Build docs: `npm run build:docs`
```

---

## What Happens to AC-IDs?

**Answer**: Keep them! They're valuable for traceability.

### spec.md (UNCHANGED):

```markdown
### US1: User Authentication (P1)

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can login with email/password
  - **Priority**: P1
  - **Testable**: Yes

- [ ] **AC-US1-02**: User can logout
  - **Priority**: P1
  - **Testable**: Yes

- [ ] **AC-US1-03**: Session expires after 30 minutes
  - **Priority**: P2
  - **Testable**: Yes
```

### tasks.md (References AC-IDs):

```markdown
### T-001: Implement Login/Logout
**Acceptance Criteria**: AC-US1-01, AC-US1-02

### T-002: Implement Session Expiry
**Acceptance Criteria**: AC-US1-03
```

**Traceability Flow**:
```
User Story (US1)
  ↓
Acceptance Criteria (AC-US1-01, AC-US1-02, AC-US1-03)
  ↓
Tasks (T-001, T-002)
  ↓
Test Plans (embedded in tasks)
  ↓
Test Files (tests/unit/auth.test.ts)
```

**No TC-IDs needed!** Test cases are referenced by function name (testValidLogin).

---

## Command Rename: validate-coverage → check-tests

### Old Name Problems:
- "validate-coverage" is verbose
- "coverage" ambiguous (code coverage? AC coverage?)
- Not intuitive

### New Name: `/specweave:check-tests`

**Why**:
- ✅ Simple and clear (like `npm test`, `pytest`)
- ✅ Verb-oriented ("check" the tests)
- ✅ Intuitive for developers

### What It Does (NEW):

```bash
/specweave:check-tests 0007

📊 Test Status Report: 0007-increment-management-v2

Task Coverage Analysis:
✅ T-001: Implement authentication (6 test cases, 87% coverage)
   - Unit: 3 tests (auth.test.ts)
   - Integration: 2 tests (auth-flow.test.ts)
   - E2E: 1 test (authentication.spec.ts)

✅ T-002: Create login form (4 test cases, 92% coverage)
   - Unit: 2 tests (LoginForm.test.tsx)
   - E2E: 2 tests (login-form.spec.ts)

⚠️  T-003: Add user dashboard (2 test cases, 65% coverage)
   - Warning: Below 80% target
   - Missing: Unit tests for Dashboard component

✅ T-004: Update README.md (N/A - documentation)
   - Validation: Manual review

❌ T-005: Implement password reset (0 test cases)
   - ERROR: No test plan defined!
   - Action: Add test cases to T-005

Overall Coverage: 81% (target: 80-90%) ✅

Acceptance Criteria Coverage:
✅ AC-US1-01: Covered by T-001 (6 tests)
✅ AC-US1-02: Covered by T-001 (6 tests)
⚠️  AC-US1-03: Partially covered by T-002 (2 tests)
   - Missing: Integration test for session expiry

🎯 Recommendations:
1. Add unit tests to T-003 (dashboard component)
2. Add test plan to T-005 (password reset)
3. Add integration test for AC-US1-03 (session expiry)

Priority: P2 (not blocking, coverage above 80%)
```

---

## test-aware-planner Agent (SIMPLIFIED)

### Old Job (with tests.md):
1. Generate tests.md (create TC-IDs)
2. Generate tasks.md (reference TC-IDs)
3. Update tests.md (fill Related Tasks field)

**Complexity**: 3 files, bidirectional linking, synchronization

### New Job (no tests.md):
1. Generate tasks.md with embedded test plans

**That's it!** Much simpler.

### Agent Prompt (Simplified):

```markdown
For each task you generate:

1. **Identify AC-IDs** it satisfies
2. **Create test plan** (Given/When/Then)
3. **List test cases**:
   - Unit tests (function names, file paths)
   - Integration tests (flow names, file paths)
   - E2E tests (scenario names, file paths)
4. **Specify coverage targets** (80-90%)
5. **Include validation** (for non-testable tasks)

Example output:
---
### T-001: Implement Feature X

**Test Plan**:
- **Given** precondition
- **When** action
- **Then** expected outcome

**Test Cases**:
1. **Unit**: `tests/unit/feature-x.test.ts`
   - testFeatureX(): ...
   - Coverage: 90%
2. **Integration**: ...
---

Do NOT create separate TC-IDs. Test cases are referenced by file + function name.
```

---

## Timeline Compression (Hours not Weeks!)

### Old Timeline (UNREALISTIC):

- Part 1 (Test-Aware): 4 weeks
- Part 2 (Status Mgmt): 4 weeks
- **Total**: 8 weeks 😱

### New Timeline (AGGRESSIVE):

**Part 1: Test-Aware Planning** (12-16 hours)
- Hour 1-2: Update plan.md (eliminate tests.md references)
- Hour 3-4: Create tasks.md (dogfood new format)
- Hour 5-8: Implement test-aware-planner agent (simplified!)
- Hour 9-10: Implement /specweave:check-tests command
- Hour 11-12: Update increment-planner skill
- Hour 13-14: Test and validate
- Hour 15-16: CLAUDE.md updates

**Part 2: Smart Status Management** (8-12 hours)
- Hour 1-2: Implement metadata.json schema
- Hour 3-4: Implement pause/resume/abandon commands
- Hour 5-6: Implement type-based limits
- Hour 7-8: Update /specweave:inc with warnings
- Hour 9-10: Update /specweave:status (rich output)
- Hour 11-12: Test and validate

**Total: 20-28 hours** (compressed from 8 weeks!)

**Why This is Realistic**:
- Eliminated tests.md = 30% less work
- Most code is simple TypeScript utilities
- Agent prompts are Markdown (no compilation)
- Commands are CRUD on JSON (trivial)
- No complex algorithms

---

## Coverage Target: 80-90% (Not 100%)

### Why Not 100%?

1. **Diminishing returns**: Last 10% takes 50% of the time
2. **Realistic**: Industry standard is 70-80%
3. **Pragmatic**: Some code is untestable (CLI output, file I/O)
4. **Focus**: High coverage on critical paths, lower on edge cases

### Target Breakdown:

| Code Type | Coverage Target | Rationale |
|-----------|----------------|-----------|
| **Core logic** | 90-95% | Business-critical |
| **API endpoints** | 85-90% | User-facing |
| **Utilities** | 80-85% | Lower risk |
| **CLI output** | 60-70% | Hard to test |
| **Overall** | 80-90% | Balanced |

### Enforcement:

```bash
/specweave:check-tests 0007

Overall Coverage: 81% ✅ (target: 80-90%)

# If below 80%:
Overall Coverage: 75% ❌ (below 80% target)
```

**Action**: Warn, but don't block. Developer discretion.

---

## Migration for Existing Increments

### Question: What about 0001-0006?

**Answer**: Leave them unchanged. New format applies to 0007+.

### Backward Compatibility:

- ✅ Old increments (with tests.md) still work
- ✅ /specweave:check-tests works with both formats
- ✅ No migration required

### Detection:

```typescript
// src/commands/check-tests.ts
function hasTestsMd(incrementId: string): boolean {
  return fs.existsSync(`.specweave/increments/${incrementId}/tests.md`);
}

if (hasTestsMd(incrementId)) {
  // Old format: Parse tests.md for TC-IDs
  return checkTestsOldFormat(incrementId);
} else {
  // New format: Parse tasks.md for embedded tests
  return checkTestsNewFormat(incrementId);
}
```

---

## Summary: What Changed

| Aspect | Old (with tests.md) | New (embedded tests) |
|--------|---------------------|---------------------|
| **Files** | spec.md, plan.md, tasks.md, tests.md | spec.md, plan.md, tasks.md |
| **Test IDs** | TC-001, TC-002 (artificial) | Function names (natural) |
| **Sync** | tasks ↔ tests (fragile) | tasks only (robust) |
| **Agent complexity** | High (3 files) | Low (1 file) |
| **Command** | validate-coverage | check-tests |
| **Coverage target** | 100% (unrealistic) | 80-90% (realistic) |
| **Timeline** | 8 weeks (too long) | 20-28 hours (aggressive) |
| **Release** | Part 1 (v0.7), Part 2 (v0.8) | All-in-one (v0.7) |

---

## Next Steps

1. ✅ This document (architecture decision)
2. ⏳ Update plan.md (reflect new architecture)
3. ⏳ Create tasks.md (dogfood the new format!)
4. ⏳ Implement test-aware-planner agent
5. ⏳ Implement /specweave:check-tests
6. ⏳ Implement status commands
7. ⏳ Test and validate
8. ⏳ Update CLAUDE.md
9. ⏳ Deliver v0.7.0 🚀

---

**Decision**: ✅ APPROVED
**Timeline**: 20-28 hours (starting now)
**Delivery**: v0.7.0 (all-in-one)
**Impact**: Simpler, faster, better aligned with industry standards
