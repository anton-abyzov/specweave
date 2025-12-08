# Tasks: {{FEATURE_TITLE}}

## Task Notation

- `[T###]`: Task ID
- `[P]`: Parallelizable
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: ⚡ haiku (simple), 💎 opus (default)

## Phase 1: Foundation & Setup

### T-001: Initialize Shared Library ({{PROJECT_SHARED_ID}})
**User Story**: US-SHARED-001
**Satisfies ACs**: AC-SHARED-US1-01, AC-SHARED-US1-02
**Status**: [ ] Not Started

**Description**: Set up shared TypeScript types and validators

**Implementation**:
- Create shared types package
- Export common interfaces and types
- Add validation schemas

**Test Plan**:
- **File**: `{{PROJECT_SHARED_ID}}/tests/types.test.ts`
- **Tests**:
  - **TC-001**: Type exports compile correctly

---

## Phase 2: Backend Implementation ({{PROJECT_BE_ID}})

### T-002: Database Schema & Models
**User Story**: US-BE-001
**Satisfies ACs**: AC-BE-US1-01, AC-BE-US1-02
**Status**: [ ] Not Started

**Description**: Create database schema for backend service

**Implementation**:
- Define Prisma/TypeORM models
- Run migrations
- Seed initial data

**Test Plan**:
- **File**: `{{PROJECT_BE_ID}}/tests/models.test.ts`
- **Tests**:
  - **TC-002**: Models create correctly
  - **TC-003**: Relationships work

### T-003: API Endpoints
**User Story**: US-BE-001, US-BE-002
**Satisfies ACs**: AC-BE-US1-01, AC-BE-US2-01
**Status**: [ ] Not Started

**Description**: Implement REST API endpoints

---

## Phase 3: Frontend Implementation ({{PROJECT_FE_ID}})

### T-004: UI Components
**User Story**: US-FE-001
**Satisfies ACs**: AC-FE-US1-01, AC-FE-US1-02
**Status**: [ ] Not Started

**Description**: Build frontend components

**Implementation**:
- Create upload component
- Add comparison view
- Wire up to backend API

**Test Plan**:
- **File**: `{{PROJECT_FE_ID}}/tests/components.test.tsx`
- **Tests**:
  - **TC-004**: Component renders correctly
  - **TC-005**: Upload triggers validation

---

## Phase 4: Integration & Testing

- [ ] [T050] Run cross-repo integration tests
- [ ] [T051] Verify all acceptance criteria across projects
