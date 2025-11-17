# ADR-0047: Canonical Definition of spec.md, plan.md, and tasks.md

**Date**: 2025-11-16
**Status**: ✅ **ACCEPTED**
**Context**: Increment 0039 (Ultra-Smart Next Command)

---

## Problem Statement

Confusion exists about what content belongs in each of the three core increment files:
- `spec.md` - Business requirements
- `plan.md` - Technical approach
- `tasks.md` - Execution plan with embedded tests

**Observed violations**:
1. ❌ "Acceptance Criteria" sections appearing in tasks.md (should only be in spec.md)
2. ❌ Technical implementation details in spec.md (should be in plan.md)
3. ❌ Task breakdowns in plan.md (should be in tasks.md)
4. ❌ Duplicate content across files

This violates SpecWeave's **Source of Truth Discipline** and creates confusion.

---

## Decision

We define a **canonical structure** for each file with strict boundaries:

### 1. spec.md - WHAT (Business Requirements)

**Owner**: Product Manager / Stakeholder
**Purpose**: Define business value and success criteria
**Audience**: Stakeholders, PMs, QA, Developers

#### MUST Contain

```markdown
# Feature Title

## Summary
Brief description of business value (2-3 sentences)

## User Stories
**US-XXX**: As a [role], I want [feature] so that [benefit]

### Acceptance Criteria
**AC-US-XXX-01**: [Business-level success criterion]
  - Must be testable, measurable, binary (pass/fail)
  - Example: "AC-US7-01: System auto-detects PLANNING increment"

**AC-US-XXX-02**: [Another criterion]

## Functional Requirements
**FR-XXX**: [What the system should do - business perspective]
  - Example: "FR-001: System shall generate plan.md from spec.md"

## Non-Functional Requirements
**NFR-XXX**: [Performance, security, scalability requirements]
  - Example: "NFR-001: Plan generation completes within 500ms"

## Constraints
- Budget, timeline, technology constraints

## Assumptions
- Dependencies, prerequisites
```

#### MUST NOT Contain

- ❌ Technical implementation details (how to build)
- ❌ Class/component names
- ❌ Task breakdowns (T-001, T-002, etc.)
- ❌ Test cases (BDD scenarios, test functions)
- ❌ Code snippets or type definitions
- ❌ Architecture decisions (ADRs belong in separate files)

#### Rules

1. **Acceptance Criteria are ONLY in spec.md**
   - Never duplicate in plan.md or tasks.md
   - Tasks reference ACs via AC-IDs: `**AC-IDs**: AC-US7-01, AC-US7-02`

2. **Business language, not technical jargon**
   - ✅ "User can filter results by date"
   - ❌ "Implement DateFilter.filterByRange() method"

3. **Stakeholder-readable**
   - Should be understandable by non-technical stakeholders

---

### 2. plan.md - HOW (Technical Solution)

**Owner**: Architect / Tech Lead
**Purpose**: Define technical approach and architecture
**Audience**: Developers, Tech Leads, Architects

#### MUST Contain

```markdown
# Implementation Plan

## Architecture Overview
- High-level technical approach
- System architecture diagram (Mermaid)
- Key design patterns used

## Components
### Component 1: ClassName
- **Purpose**: What it does technically
- **Responsibilities**: Core functions it provides
- **Dependencies**: Other components it depends on
- **File**: `src/path/to/ClassName.ts`

### Component 2: AnotherClass
- ...

## Data Models
```typescript
interface TypeName {
  field: type;
  // Purpose of this type
}
```

## API Contracts
- External APIs, endpoints
- Request/response formats
- Error handling

## Integration Points
- External services (GitHub, JIRA)
- Databases, file systems
- Third-party libraries

## Technical Decisions
- Why we chose approach X over Y
- Trade-offs considered
- Performance implications

## Implementation Phases
### Phase 1: Foundation (X hours)
- Build components A, B, C
- Establish data models
- Set up integration points

### Phase 2: Feature Implementation (Y hours)
- Implement core logic
- Add error handling
- Integrate components

### Phase 3: Testing & Polish (Z hours)
- Write tests
- Performance optimization
- Documentation
```

#### MUST NOT Contain

- ❌ Acceptance Criteria (business requirements from spec.md)
- ❌ User Stories (stakeholder perspective)
- ❌ Detailed task checklists with checkboxes (T-001: [ ] do this)
- ❌ Test cases (BDD scenarios belong in tasks.md)
- ❌ "As a user" language (that's spec.md)

#### Rules

1. **Technical perspective only**
   - Focus on HOW to build, not WHAT to build
   - ✅ "IncrementDetector.detect() returns IncrementDetectionResult"
   - ❌ "User can auto-detect planning increment"

2. **Architecture, not execution**
   - Describe components and their relationships
   - Don't break down into task-level steps

3. **Developer-readable**
   - Assumes technical knowledge
   - Can include code snippets, type definitions

---

### 3. tasks.md - WHO/WHEN (Execution Plan)

**Owner**: Tech Lead / Developer
**Purpose**: Break down work into executable tasks with embedded tests
**Audience**: Developers, QA Engineers

#### MUST Contain (per task)

```markdown
### T-XXX: [Task Title] ([Priority: P1/P2/P3])

**Effort**: [X]h | **AC-IDs**: AC-US-XXX-YY, AC-US-XXX-ZZ  ← Links to spec.md

**Implementation**:  ← NOT "Acceptance Criteria"!
- [ ] Create ClassName with method1()
- [ ] Implement feature logic in method2()
- [ ] Add error handling for edge case X
- [ ] Update types in types.ts
- [ ] Add JSDoc comments

**Test Plan** (BDD):
- **Given** [precondition describing initial state]
- **When** [action or event that triggers behavior]
- **Then** [expected result or outcome]

**Test Cases**:
- Unit (`class-name.test.ts`):
  - method1_withValidInput_returnsExpectedResult
  - method1_withInvalidInput_throwsError
  - method2_withEdgeCase_handlesGracefully
  - Coverage: >95%
- Integration (`feature.integration.test.ts`):
  - fullWorkflow_happyPath_succeeds
  - Coverage: >85%

**Files Changed**:
- `src/path/to/ClassName.ts` (new)
- `src/path/to/types.ts` (update)
- `tests/unit/ClassName.test.ts` (new)
- `tests/integration/feature.integration.test.ts` (new)
```

#### MUST NOT Contain

- ❌ **"Acceptance Criteria"** sections
  - ACs are defined in spec.md, referenced via AC-IDs
  - Checkboxes in tasks.md are **Implementation Steps**, not ACs

- ❌ Architecture decisions (those go in plan.md)
- ❌ Business requirements (those go in spec.md)
- ❌ Duplicate ACs from spec.md

#### Rules

1. **Implementation Steps, NOT Acceptance Criteria**
   - ✅ `**Implementation**: - [ ] Create IncrementDetector class`
   - ❌ `**Acceptance Criteria**: - [ ] System detects increment`

2. **AC-IDs link to spec.md**
   - `**AC-IDs**: AC-US7-01, AC-US7-02`
   - This shows which business requirements this task satisfies

3. **Embedded test plans**
   - Every task MUST have BDD test plan
   - Every task MUST list specific test cases
   - Coverage targets required (95%+ for critical paths)

4. **Checkable implementation steps**
   - Developer can tick off as they work
   - Specific, actionable, technical
   - Not business-level criteria

---

## Rationale

### Why This Separation?

**Different audiences**:
- **spec.md**: Stakeholders need to understand business value
- **plan.md**: Architects need to design technical solution
- **tasks.md**: Developers need executable steps with tests

**Single Source of Truth**:
- Each concept lives in exactly ONE place
- No duplication = no inconsistency
- Clear ownership and authority

**Bidirectional sync**:
- External tools (GitHub, JIRA) expect this structure
- ACs in spec.md → GitHub issue ACs
- Tasks in tasks.md → GitHub issue task checkboxes
- Mixing breaks the sync

**Workflow alignment**:
```
PM writes spec.md (WHAT)
    ↓
Architect writes plan.md (HOW)
    ↓
Tech Lead writes tasks.md (WHO/WHEN)
    ↓
Developer executes tasks
```

---

## Validation Rules

### Automated Checks

1. **spec.md validation**:
   - ✅ Contains "Acceptance Criteria" section
   - ✅ ACs follow AC-XXX-YY format
   - ❌ Does NOT contain technical class names
   - ❌ Does NOT contain task IDs (T-001)

2. **plan.md validation**:
   - ✅ Contains "Components" or "Architecture" section
   - ✅ Uses technical language
   - ❌ Does NOT contain "Acceptance Criteria" section
   - ❌ Does NOT contain task checkboxes

3. **tasks.md validation**:
   - ✅ Contains task headers (### T-XXX)
   - ✅ Each task has **Implementation** section
   - ✅ Each task has **Test Plan (BDD)** section
   - ✅ Each task has **AC-IDs** references
   - ❌ Does NOT contain "Acceptance Criteria" sections
   - ❌ Does NOT contain "As a user" language

---

## Examples

### ❌ WRONG (Mixing Concepts)

**tasks.md**:
```markdown
### T-001: Implement User Login

**Acceptance Criteria**:  ← ❌ NO! This is spec.md content!
- [ ] User can log in with email
- [ ] System validates password
- [ ] Error shown for invalid credentials
```

**Correct Version**:
```markdown
### T-001: Implement User Login (P1)

**Effort**: 3h | **AC-IDs**: AC-US2-01, AC-US2-02, AC-US2-03

**Implementation**:  ← ✅ Technical steps!
- [ ] Create AuthService.login(email, password)
- [ ] Add password validation with bcrypt
- [ ] Implement error handling for invalid credentials
- [ ] Add JSDoc comments

**Test Plan** (BDD):
- **Given** user exists with valid credentials
- **When** user calls login() with correct email/password
- **Then** authentication token returned

**Test Cases**:
- Unit (`auth-service.test.ts`):
  - login_withValidCredentials_returnsToken
  - login_withInvalidPassword_throwsError
  - Coverage: >95%
```

---

### ✅ CORRECT (Proper Separation)

**spec.md**:
```markdown
## User Story: US-002 User Authentication

**US-002**: As a user, I want to log in securely so that I can access my account.

### Acceptance Criteria
**AC-US2-01**: User can log in with email and password
**AC-US2-02**: System validates password strength
**AC-US2-03**: Error message shown for invalid credentials
```

**plan.md**:
```markdown
## Component: AuthService

**Purpose**: Handle user authentication and session management

**Responsibilities**:
- Validate user credentials
- Generate JWT tokens
- Manage session state

**Dependencies**:
- UserRepository (for fetching user data)
- PasswordHasher (bcrypt wrapper)
- JWTService (token generation)

**File**: `src/services/auth-service.ts`

**API**:
```typescript
class AuthService {
  async login(email: string, password: string): Promise<AuthToken>
  async logout(userId: string): Promise<void>
}
```
```

**tasks.md**:
```markdown
### T-001: Implement AuthService.login() (P1)

**Effort**: 3h | **AC-IDs**: AC-US2-01, AC-US2-03

**Implementation**:
- [ ] Create AuthService class in src/services/
- [ ] Implement login(email, password) method
- [ ] Integrate with UserRepository for user lookup
- [ ] Add password validation with bcrypt
- [ ] Implement error handling (InvalidCredentialsError)
- [ ] Generate JWT token on success
- [ ] Add JSDoc comments

**Test Plan** (BDD):
- **Given** user "test@example.com" exists with password "SecurePass123"
- **When** login("test@example.com", "SecurePass123") called
- **Then** valid JWT token returned

**Test Cases**:
- Unit (`auth-service.test.ts`):
  - login_withValidCredentials_returnsToken
  - login_withInvalidPassword_throwsInvalidCredentialsError
  - login_withNonexistentUser_throwsUserNotFoundError
  - login_withWeakPassword_throwsPasswordValidationError
  - Coverage: >95%
- Integration (`auth-flow.integration.test.ts`):
  - fullLoginFlow_happyPath_generatesValidToken
  - Coverage: >85%

**Files Changed**:
- `src/services/auth-service.ts` (new)
- `src/services/types.ts` (update - add AuthToken interface)
- `tests/unit/services/auth-service.test.ts` (new)
- `tests/integration/auth-flow.integration.test.ts` (new)
```

---

## Migration Strategy

### Phase 1: Audit (Immediate)

```bash
# Find all tasks.md with "Acceptance Criteria" sections
grep -r "**Acceptance Criteria**" .specweave/increments/*/tasks.md

# Expected: ZERO matches
```

### Phase 2: Refactor (Short-term)

For each violation:
1. Move ACs to spec.md (if not already there)
2. Replace "Acceptance Criteria" with "Implementation" in tasks.md
3. Add AC-IDs references: `**AC-IDs**: AC-US7-01`
4. Ensure BDD test plans are present

### Phase 3: Validation (Long-term)

Add to `/specweave:validate`:
```typescript
function validateIncrementStructure(incrementId: string): ValidationResult {
  const tasksContent = readTasksFile(incrementId);

  if (tasksContent.includes('**Acceptance Criteria**:')) {
    return {
      valid: false,
      error: {
        code: 'TASKS_CONTAINS_AC',
        message: 'tasks.md should NOT contain "Acceptance Criteria" sections. ACs belong in spec.md only.',
        fix: 'Replace with "**Implementation**:" and add AC-ID references'
      }
    };
  }

  // More validations...
}
```

### Phase 4: Templates (Long-term)

Update `tasks.md.template`:
```markdown
### T-{ID}: {Task Title} ({Priority})

**Effort**: {hours}h | **AC-IDs**: {AC-US-XX-YY, AC-US-XX-ZZ}

**Implementation**:  ← NOT "Acceptance Criteria"!
- [ ] {Technical step 1}
- [ ] {Technical step 2}

**Test Plan** (BDD):
- **Given** {precondition}
- **When** {action}
- **Then** {expected result}

**Test Cases**:
- Unit (`{file}.test.ts`):
  - {testCase1}
  - {testCase2}
  - Coverage: >95%

**Files Changed**:
- `{file1}` (new/update)
- `{file2}` (new/update)
```

---

## Consequences

### Positive

- ✅ Clear separation of concerns
- ✅ No content duplication
- ✅ Single source of truth for each concept
- ✅ Bidirectional sync works correctly
- ✅ Different audiences can read their relevant file
- ✅ Easier to maintain and update

### Negative

- ⚠️ Requires refactoring existing increments
- ⚠️ Teams must learn the distinctions
- ⚠️ Agents must be updated to follow rules

### Mitigation

- Provide clear documentation (this ADR)
- Add validation to prevent future violations
- Create migration scripts for bulk refactoring
- Update agent prompts with canonical structure

---

## References

- **SpecWeave Source of Truth Discipline**: CLAUDE.md
- **Template Files**: `templates/tasks.md.template`
- **Validation**: `src/core/validation/increment-validator.ts`

---

## Status

**Status**: ✅ **ACCEPTED**
**Date**: 2025-11-16
**Author**: Claude (SpecWeave Architect Agent)
**Reviewers**: Anton (Human oversight)

---

**This ADR is now the canonical reference for spec.md, plan.md, and tasks.md structure.**
