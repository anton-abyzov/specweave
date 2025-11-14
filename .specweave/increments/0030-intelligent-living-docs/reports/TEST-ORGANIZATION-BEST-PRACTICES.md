# Test Organization Best Practices - SpecWeave Philosophy

**Status**: Design Analysis
**Date**: 2025-11-13
**Increment**: 0030-intelligent-living-docs
**Author**: SpecWeave Team

---

## Executive Summary

**Question**: Should unit and integration tests be separate atomic files in living docs, or connected to tasks/user stories?

**Answer**: Tests should be **embedded in tasks**, NOT separate atomic files. SpecWeave follows a three-level test architecture that maintains traceability without duplication.

**Three-Level Test Architecture**:
1. **Spec (spec.md)**: Acceptance Criteria (AC-US1-01, AC-US1-02) - WHAT to test
2. **Tasks (tasks.md)**: Embedded Test Plans (BDD + test cases) - HOW to test
3. **Code (tests/)**: Test Implementation - WHERE tests are

**Key Principle**: Tests belong in the **execution context** (tasks.md), not as standalone documentation.

---

## The Problem: Where Should Tests Live?

### ❌ Anti-Pattern: Tests as Separate Documents

**Bad Approach** (creates duplication and sync issues):

```
.specweave/docs/internal/
├── specs/backend/
│   └── us-001-user-login.md              ← User Story
├── delivery/
│   ├── test-strategy-authentication.md   ← ❌ Separate test doc
│   ├── unit-tests-authentication.md      ← ❌ Duplicate of tasks.md
│   └── integration-tests-auth.md         ← ❌ Duplicate of tasks.md
└── tests/
    └── auth.test.ts                      ← Actual test code
```

**Why This Fails**:
- ❌ **Duplication**: Test plans in `delivery/` AND `tasks.md`
- ❌ **Sync Issues**: Update tasks.md, forget to update delivery/
- ❌ **Disconnect**: User story → test strategy has no direct link
- ❌ **No Traceability**: Can't see which task implements which AC

### ✅ SpecWeave's Approach: Embedded Test Plans

**Good Approach** (single source of truth):

```
.specweave/increments/0016-authentication/
├── spec.md              ← User Stories with AC-IDs (WHAT to test)
├── tasks.md             ← Embedded Test Plans (HOW to test)
│   ├── T-001: Create Login Endpoint
│   │   ├── **AC**: AC-US1-01, AC-US1-02  ← Traceability!
│   │   ├── **Test Plan** (BDD)           ← HOW to test
│   │   ├── **Test Cases**: Unit + Integration + E2E
│   │   └── **Coverage**: 90% unit, 85% integration
│   └── T-002: JWT Token Generation
│       └── (same structure)
└── plan.md              ← High-level test strategy ONLY

tests/                   ← Actual test code (WHERE tests are)
└── unit/
    └── auth.test.ts
```

**Why This Works**:
- ✅ **Single Source of Truth**: Test plans in tasks.md (execution context)
- ✅ **No Duplication**: One place to update test strategy
- ✅ **Direct Traceability**: AC-US1-01 → T-001 → auth.test.ts
- ✅ **Context Preserved**: Test plan lives WITH implementation details

---

## SpecWeave's Three-Level Test Architecture

### Level 1: Spec (spec.md) - Acceptance Criteria

**Purpose**: Define WHAT needs to be tested (business requirements)

**Content**:
- User Stories (US-001, US-002, etc.)
- Acceptance Criteria (AC-US1-01, AC-US1-02, etc.)
- Business rationale

**Example** (from `spec.md`):

```markdown
#### US-001: User Login

**As a** user
**I want** to log in with email/password
**So that** I can access protected resources

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can enter credentials (P1, testable)
- [ ] **AC-US1-02**: User receives JWT token (P1, testable)
- [ ] **AC-US1-03**: Invalid credentials show error (P1, testable)

**Business Rationale**: Core authentication requirement for all users.
```

**Key Points**:
- ✅ Defines WHAT to test (acceptance criteria)
- ✅ AC-IDs provide traceability
- ❌ No test implementation details (that's in tasks.md)

### Level 2: Tasks (tasks.md) - Embedded Test Plans

**Purpose**: Define HOW to test (test strategy for each task)

**Content**:
- AC-IDs mapping (which ACs this task satisfies)
- Test Plan (BDD format - Given/When/Then)
- Test Cases (unit/integration/E2E with file paths and coverage targets)
- Overall coverage

**Example** (from `tasks.md`):

```markdown
### T-001: Create Login Endpoint

**AC**: AC-US1-01, AC-US1-02, AC-US1-03  ← Traceability!

**Test Plan** (BDD):
- **Given** valid credentials → **When** login → **Then** receive JWT token
- **Given** invalid credentials → **When** login → **Then** return 401 error
- **Given** missing fields → **When** login → **Then** return 400 error

**Test Cases**:
- Unit (`auth.test.ts`): validLogin, invalidPassword, missingEmail → 90% coverage
- Integration (`auth-flow.test.ts`): loginEndpoint, tokenGeneration → 85% coverage
- E2E (`auth-e2e.spec.ts`): userLoginFlow, sessionPersistence → 80% coverage
- **Overall: 87% coverage**

**Implementation**:
- Create `src/auth/login-endpoint.ts`
- Methods: `validateCredentials()`, `generateJWT()`, `handleLogin()`
- TDD: Write tests first, implement to pass

**Dependencies**: None
**Estimate**: 1 day
```

**Key Points**:
- ✅ Maps AC-IDs to tasks (AC-US1-01, AC-US1-02 → T-001)
- ✅ BDD format (Given/When/Then) for clarity
- ✅ Test cases with file paths and coverage targets
- ✅ Lives WITH implementation context (not separate)

### Level 3: Code (tests/) - Test Implementation

**Purpose**: Actual test code that validates AC-IDs

**Content**:
- Test files in codebase (`tests/unit/`, `tests/integration/`, `tests/e2e/`)
- Test suites and test cases
- Assertions and validations

**Where Tests Live** (Enterprise Best Practices):
- ✅ **Unit Tests**: Always in same repo (co-located or centralized)
- ✅ **Integration Tests**: Same repo for single service, separate for cross-service
- ⚠️ **E2E Tests**: Separate repo if slow (>15 min) or cross-service
- ✅ **Performance Tests**: Always separate repo (different tools/team)
- ✅ **Security Tests**: Usually separate repo (specialized team)

See [ENTERPRISE-TEST-ARCHITECTURE.md](./ENTERPRISE-TEST-ARCHITECTURE.md) for complete analysis.

**Example** (from `tests/unit/auth.test.ts`):

```typescript
describe('Login Endpoint', () => {
  // AC-US1-01: User can enter credentials
  it('should accept valid credentials', async () => {
    const result = await login('user@example.com', 'password123');
    expect(result.success).toBe(true);
  });

  // AC-US1-02: User receives JWT token
  it('should return JWT token on success', async () => {
    const result = await login('user@example.com', 'password123');
    expect(result.token).toBeDefined();
    expect(result.token).toMatch(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/);
  });

  // AC-US1-03: Invalid credentials show error
  it('should return 401 for invalid credentials', async () => {
    await expect(login('user@example.com', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});
```

**Key Points**:
- ✅ Test code lives in codebase (not living docs)
- ✅ Comments reference AC-IDs for traceability
- ✅ Test file paths match tasks.md references

---

## Traceability Flow

### Complete Traceability: Spec → Task → Test

**Traceability Chain**:

```
Spec (spec.md)
    ↓
    AC-US1-01: User can enter credentials
    AC-US1-02: User receives JWT token
    ↓
Task (tasks.md)
    ↓
    T-001: Create Login Endpoint
    **AC**: AC-US1-01, AC-US1-02  ← Explicit mapping!
    **Test Cases**: auth.test.ts, auth-flow.test.ts
    ↓
Code (tests/unit/auth.test.ts)
    ↓
    it('should accept valid credentials')  ← Validates AC-US1-01
    it('should return JWT token')          ← Validates AC-US1-02
```

**Benefits**:
- ✅ **Bidirectional**: AC-US1-01 → T-001 → auth.test.ts (forward)
- ✅ **Verifiable**: Can trace test back to AC-ID (backward)
- ✅ **Auditable**: Compliance teams can verify AC coverage
- ✅ **Automatable**: Scripts can parse AC-IDs from tasks.md

### Example: Finding Tests for AC-US1-01

**Query**: "Which tests validate AC-US1-01?"

**Process**:
1. Find tasks that reference AC-US1-01 (grep `"AC-US1-01"` in tasks.md)
2. Extract test cases from those tasks (e.g., `auth.test.ts`)
3. Find test files in codebase (`tests/unit/auth.test.ts`)
4. Read tests that mention AC-US1-01 in comments

**Result**: Complete traceability from AC → Task → Test

---

## What Gets Extracted to Living Docs?

### ✅ Extract as Atomic Files

**User Stories**:
- File: `specs/backend/us-001-user-login.md`
- Content: Description, Acceptance Criteria, Business Rationale
- Links: → tasks.md (where test plans live)

**Example**:

```markdown
---
id: us-001-user-login
title: "US-001: User Login"
tags: ["user-story", "backend", "authentication"]
category: "user-story"
---

# US-001: User Login

**As a** user
**I want** to log in with email/password
**So that** I can access protected resources

## Acceptance Criteria

- [x] **AC-US1-01**: User can enter credentials (P1, testable)
- [x] **AC-US1-02**: User receives JWT token (P1, testable)

## Implementation

**Increment**: [0016-authentication](../../../../increments/0016-authentication/tasks.md)

**Tasks** (with embedded test plans):
- [T-001: Create Login Endpoint](../../../../increments/0016-authentication/tasks.md#t-001-create-login-endpoint)
  - Test Plan: BDD scenarios for valid/invalid login
  - Coverage: 90% unit, 85% integration
- [T-002: JWT Token Generation](../../../../increments/0016-authentication/tasks.md#t-002-jwt-token-generation)
  - Test Plan: Token generation and validation
  - Coverage: 95% unit

**Test Files** (in codebase):
- Unit: [`tests/unit/auth.test.ts`](../../../../tests/unit/auth.test.ts)
- Integration: [`tests/integration/auth-flow.test.ts`](../../../../tests/integration/auth-flow.test.ts)

---

_Source: Increment 0016-authentication | Last Updated: 2025-11-13_
```

**Key Points**:
- ✅ User Story includes AC-IDs
- ✅ Links to tasks.md (where test plans are embedded)
- ✅ Links to test files in codebase
- ❌ Does NOT duplicate test plans (they're in tasks.md)

### ❌ Do NOT Extract as Separate Files

**Unit Test Plans**:
- ❌ `delivery/unit-tests-authentication.md` (duplicates tasks.md)

**Integration Test Plans**:
- ❌ `delivery/integration-tests-auth.md` (duplicates tasks.md)

**Per-Feature Test Strategies**:
- ❌ `delivery/test-strategy-authentication.md` (unless it's HIGH-LEVEL)

**Why Not?**
- Test plans belong in execution context (tasks.md)
- Extracting them creates duplication and sync issues
- Loses connection between implementation and testing

### ✅ Exception: High-Level Test Strategy

**Extract ONLY if it's high-level and cross-cutting**:

**Example**: `delivery/test-strategy-overall.md`

```markdown
---
id: test-strategy-overall
title: "Test Strategy: SpecWeave"
category: "delivery"
---

# Test Strategy: SpecWeave

## Overall Approach

- **TDD First**: Write tests before implementation
- **BDD Format**: Use Given/When/Then for clarity
- **AC Traceability**: Every test references an AC-ID

## Coverage Targets

- Unit Tests: 90%+
- Integration Tests: 85%+
- E2E Tests: 80%+

## Test Tools

- **Unit**: Jest (TypeScript)
- **Integration**: Jest + real APIs
- **E2E**: Playwright

## Test Organization

- Test plans embedded in `tasks.md` (not separate docs)
- Test code in `tests/` directory (not living docs)
- AC-IDs provide traceability

---

This is a HIGH-LEVEL strategy, not per-feature test plans.
Per-feature test plans live in `tasks.md`.
```

**Key Points**:
- ✅ High-level patterns and standards
- ✅ Applies to ALL features (not just authentication)
- ❌ Does NOT include specific test cases (those are in tasks.md)

---

## Atomic Sync Architecture - Revised

### What Changes for Atomic Sync?

**Before** (my original proposal):

```
Extract "Test Strategy" section from spec.md
    ↓
Create delivery/test-strategy-authentication.md  ← ❌ WRONG!
```

**After** (revised based on SpecWeave philosophy):

```
Extract "Test Strategy" section from spec.md
    ↓
Is it HIGH-LEVEL (overall approach)?
    ├─ YES → Create delivery/test-strategy-overall.md  ← ✅ OK
    └─ NO → Skip (it's in tasks.md already)           ← ✅ CORRECT
```

### Revised ItemExtractor Logic

**Old Logic** (extracts all test content):

```typescript
private extractDeliveryDocs(section: Section): AtomicItem[] {
  // ❌ WRONG: Extracts per-feature test plans
  const testStrategyPattern = /###\s+(?:Unit|Integration|E2E)\s+Tests\s*\n([\s\S]*?)(?=###|$)/gi;
  // ... extract and create separate files
}
```

**New Logic** (only extracts high-level strategy):

```typescript
private extractDeliveryDocs(section: Section): AtomicItem[] {
  const items: AtomicItem[] = [];

  // Check if this is HIGH-LEVEL test strategy
  const isHighLevel = this.isHighLevelTestStrategy(section.content);

  if (isHighLevel) {
    // Extract high-level patterns and standards
    items.push({
      id: 'test-strategy-overall',
      type: 'delivery',
      title: 'Test Strategy: Overall Approach',
      content: section.content,
      // ...
    });
  } else {
    // Skip per-feature test plans (they're in tasks.md)
    console.log('   ℹ️  Skipping per-feature test plans (embedded in tasks.md)');
  }

  return items;
}

private isHighLevelTestStrategy(content: string): boolean {
  // High-level if it mentions:
  // - Overall approach
  // - Tools and frameworks
  // - Organization patterns
  // - NOT specific test cases for one feature

  const highLevelKeywords = [
    'overall approach',
    'test tools',
    'test organization',
    'coverage targets',
    'test frameworks',
  ];

  const lowLevelKeywords = [
    'unit tests:',       // Specific test cases
    'integration tests:',
    'given.*when.*then', // BDD scenarios
    'test cases:',
    'auth.test.ts',      // Specific file names
  ];

  const hasHighLevel = highLevelKeywords.some(keyword =>
    content.toLowerCase().includes(keyword)
  );

  const hasLowLevel = lowLevelKeywords.some(keyword =>
    new RegExp(keyword, 'i').test(content)
  );

  // High-level if it has high-level keywords AND NOT low-level details
  return hasHighLevel && !hasLowLevel;
}
```

### User Story Files: Link to Tasks

**User Story files should link to tasks.md (where tests live)**:

```markdown
# US-001: User Login

**As a** user...

## Acceptance Criteria

- [x] **AC-US1-01**: User can enter credentials
- [x] **AC-US1-02**: User receives JWT token

## Implementation

**Increment**: [0016-authentication](../../../../increments/0016-authentication/tasks.md)

**Tasks** (with embedded test plans):
- [T-001: Create Login Endpoint](../../../../increments/0016-authentication/tasks.md#t-001-create-login-endpoint)
  - **AC**: AC-US1-01, AC-US1-02, AC-US1-03
  - **Test Plan**: BDD scenarios (Given/When/Then)
  - **Test Cases**: 90% unit, 85% integration
  - **Test Files**: `auth.test.ts`, `auth-flow.test.ts`

**Direct Test Links**:
- Unit: [`tests/unit/auth.test.ts`](../../../../tests/unit/auth.test.ts)
- Integration: [`tests/integration/auth-flow.test.ts`](../../../../tests/integration/auth-flow.test.ts)

---

_Note: Test plans are embedded in tasks.md (not separate docs)_
```

**Key Points**:
- ✅ Links to tasks.md (where test plans are embedded)
- ✅ Shows AC-ID mapping (which tasks satisfy which ACs)
- ✅ Shows coverage summary (high-level overview)
- ✅ Links directly to test files in codebase
- ❌ Does NOT duplicate test plans (they're in tasks.md)

---

## Comparison: Atomic Sync Before vs After

### Before (Original Proposal)

**Extracted Files**:
```
.specweave/docs/internal/
├── specs/backend/
│   ├── us-001-user-login.md               ← User Story
│   └── us-002-session-management.md
├── architecture/
│   └── auth-oauth-flow.md
└── delivery/
    └── test-strategy-authentication.md    ← ❌ Duplication!
        ├── Unit Tests:
        │   - Login flow (90% coverage)   ← ❌ Already in tasks.md!
        └── Integration Tests:
            - Auth flow (85% coverage)    ← ❌ Already in tasks.md!
```

**Problems**:
- ❌ `test-strategy-authentication.md` duplicates `tasks.md`
- ❌ Two sources of truth for test plans
- ❌ Update tasks.md → must update delivery/ too
- ❌ Loses connection between tests and implementation

### After (Revised Proposal)

**Extracted Files**:
```
.specweave/docs/internal/
├── specs/backend/
│   ├── us-001-user-login.md               ← User Story
│   │   ├── Acceptance Criteria
│   │   ├── Links to tasks.md (test plans)  ← ✅ No duplication!
│   │   └── Links to test files in codebase
│   └── us-002-session-management.md
├── architecture/
│   └── auth-oauth-flow.md
└── delivery/
    └── test-strategy-overall.md           ← ✅ High-level ONLY
        ├── Overall Approach (TDD, BDD)
        ├── Coverage Targets (90%/85%/80%)
        └── Test Tools (Jest, Playwright)
        └── Note: Per-feature test plans are in tasks.md
```

**Benefits**:
- ✅ No duplication (test plans stay in tasks.md)
- ✅ Single source of truth (tasks.md)
- ✅ User stories link to tasks.md (direct connection)
- ✅ Only high-level test strategy extracted

---

## Best Practices Summary

### Do's ✅

1. **Embed Test Plans in tasks.md**
   - Test plans belong WITH implementation context
   - BDD format (Given/When/Then)
   - AC-ID traceability (which ACs this task satisfies)
   - Coverage targets per task

2. **Link User Stories to tasks.md**
   - User Story files include AC-IDs
   - Link to tasks.md (where test plans are)
   - Link to test files in codebase
   - Show coverage summary (high-level)

3. **Extract High-Level Test Strategy ONLY**
   - Overall approach (TDD, BDD, etc.)
   - Tools and frameworks (Jest, Playwright)
   - Coverage targets (90%/85%/80%)
   - Organization patterns

4. **Keep Test Code in Codebase**
   - Test files in `tests/` directory
   - Not in living docs (`.specweave/docs/`)
   - Referenced from tasks.md and user stories

### Don'ts ❌

1. **Don't Create Per-Feature Test Strategy Docs**
   - ❌ `delivery/test-strategy-authentication.md` (duplicates tasks.md)
   - ❌ `delivery/unit-tests-authentication.md` (duplicates tasks.md)
   - Use tasks.md instead

2. **Don't Duplicate Test Plans**
   - Test plans in tasks.md (single source of truth)
   - User stories link to tasks.md (no duplication)

3. **Don't Put Test Code in Living Docs**
   - Test files belong in codebase (`tests/`)
   - Not in `.specweave/docs/`

4. **Don't Lose AC-ID Traceability**
   - Every task must reference AC-IDs
   - Every test should validate specific AC-IDs
   - Traceability: AC → Task → Test

---

## Atomic Sync Implementation Changes

### AtomicSyncEngine: Skip Per-Feature Tests

**Add Logic to Skip Per-Feature Test Extraction**:

```typescript
class AtomicSyncEngine {
  async distribute(incrementId: string): Promise<DistributionResult> {
    // 1. Parse sections
    const sections = this.sectionParser.parse(specContent);

    // 2. Extract items from each section
    const items: AtomicItem[] = [];
    for (const section of sections) {
      if (section.type === 'delivery') {
        // Only extract high-level test strategy
        const deliveryItems = this.itemExtractor.extractDeliveryDocs(section);
        if (deliveryItems.length > 0) {
          console.log('   ✅ Extracted high-level test strategy');
          items.push(...deliveryItems);
        } else {
          console.log('   ℹ️  Skipped per-feature test plans (embedded in tasks.md)');
        }
      } else {
        items.push(...this.itemExtractor.extract(section));
      }
    }

    // 3. Generate files (no test duplication)
    // ...
  }
}
```

### UserStoryFileGenerator: Add Test Links

**Generate User Story Files with Links to tasks.md**:

```typescript
class UserStoryFileGenerator {
  formatUserStoryFile(userStory: UserStoryFile): string {
    const lines: string[] = [];

    // ... frontmatter and description ...

    // Implementation section
    lines.push('## Implementation');
    lines.push('');
    lines.push(`**Increment**: [${userStory.implementation.increment}](${this.getIncrementTasksPath(userStory.implementation.increment)})`);
    lines.push('');

    // Tasks (with embedded test plans)
    lines.push('**Tasks** (with embedded test plans):');
    for (const task of userStory.implementation.tasks) {
      lines.push(`- [${task.id}: ${task.title}](${task.path})`);

      // Show AC mapping
      if (task.acIds?.length > 0) {
        lines.push(`  - **AC**: ${task.acIds.join(', ')}`);
      }

      // Show test summary
      if (task.testSummary) {
        lines.push(`  - **Test Plan**: ${task.testSummary.plan}`);
        lines.push(`  - **Test Cases**: ${task.testSummary.unitCoverage}% unit, ${task.testSummary.integrationCoverage}% integration`);
        lines.push(`  - **Test Files**: ${task.testSummary.testFiles.join(', ')}`);
      }
    }

    lines.push('');

    // Direct test links (to codebase)
    if (userStory.implementation.testFiles?.length > 0) {
      lines.push('**Direct Test Links**:');
      for (const testFile of userStory.implementation.testFiles) {
        const relativePath = this.getRelativePathToCodebase(testFile);
        lines.push(`- ${testFile.type}: [\`${testFile.path}\`](${relativePath})`);
      }
      lines.push('');
    }

    // Note
    lines.push('---');
    lines.push('');
    lines.push('_Note: Test plans are embedded in tasks.md (not separate docs)_');
    lines.push('');

    return lines.join('\n');
  }
}
```

---

## Conclusion

**Core Principle**: Tests belong in the **execution context** (tasks.md), not as standalone documentation.

**Three-Level Test Architecture**:
1. **Spec (spec.md)**: Acceptance Criteria (WHAT to test)
2. **Tasks (tasks.md)**: Embedded Test Plans (HOW to test)
3. **Code (tests/)**: Test Implementation (WHERE tests are)

**For Atomic Sync**:
- ✅ Extract User Stories with AC-IDs
- ✅ Link User Stories to tasks.md (where test plans are)
- ✅ Extract high-level test strategy ONLY (if it exists)
- ❌ Don't extract per-feature test plans (they're in tasks.md)
- ❌ Don't duplicate test content

**Benefits**:
- ✅ Single source of truth (tasks.md)
- ✅ No duplication or sync issues
- ✅ Complete traceability (AC → Task → Test)
- ✅ Context preserved (tests WITH implementation)

---

**Status**: ✅ Ready for Implementation
**Next Steps**:
1. Update AtomicSyncEngine to skip per-feature test extraction
2. Enhance UserStoryFileGenerator to link to tasks.md
3. Add isHighLevelTestStrategy() validation
4. Update documentation and examples

---

**Approvers**: SpecWeave Core Team
**Date**: 2025-11-13
