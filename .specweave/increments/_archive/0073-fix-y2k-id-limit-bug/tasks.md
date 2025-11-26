---
increment: 0073-fix-y2k-id-limit-bug
status: completed
phases:
  - core-validation
  - living-docs
  - parsers
  - validators
  - integrations
  - testing
estimated_tasks: 14
---

# Implementation Tasks: Fix Y2K-Style ID Limit Bug

## Phase 1: Core ID Validation

### T-001: Fix delete-feature.ts validation pattern
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/cli/commands/delete-feature.ts`
- Line 18: Change `/^FS-\d{3}$/` to `/^FS-\d{3,}$/`
- Lines 22-31: Update error messages from "exactly 3 digits" to "3 or more digits"

**Test Plan**:
```gherkin
Given the delete-feature command
When called with FS-1000
Then it should accept the ID (not reject as invalid)

Given the delete-feature command
When called with FS-001
Then it should still work (backward compatibility)
```

---

### T-002: Fix feature-id-manager.ts greenfield detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/core/living-docs/feature-id-manager.ts`
- Line 253: Change `/^FS-\d{3}$/` to `/^FS-\d{3,}$/`
- Line 324: Change `/^FS-(\d{3})$/` to `/^FS-(\d{3,})$/`

**Test Plan**:
```gherkin
Given a feature with ID FS-1000
When checking if greenfield
Then it should correctly detect greenfield status

Given a feature with ID FS-001
When checking if greenfield
Then it should still work (backward compatibility)
```

---

## Phase 2: Living Docs

### T-003: Fix hierarchy-mapper.ts patterns
**User Story**: US-001
**Satisfies ACs**: AC-US1-06
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/core/living-docs/hierarchy-mapper.ts`
- Line 525: Change `/^FS-\d{3}$/` to `/^FS-\d{3,}$/`
- Line 718: Change `/^FS-\d{3}E?$/` to `/^FS-\d{3,}E?$/`
- Line 772: Change `/^FS-\d{3}E?$/` to `/^FS-\d{3,}E?$/`

**Test Plan**:
```gherkin
Given a folder named FS-1000
When hierarchy mapper scans directories
Then it should recognize FS-1000 as a valid feature folder

Given folders FS-001 and FS-999
When hierarchy mapper scans directories
Then both should still be recognized (backward compatibility)
```

---

### T-004: Fix fs-id-allocator.ts scanning patterns
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-06
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/living-docs/fs-id-allocator.ts`
- Line 231: Change `/^FS-\d{3}E?$/` to `/^FS-\d{3,}E?$/`
- Line 308: Change `/^(FS-\d{3}E?)$/` to `/^(FS-\d{3,}E?)$/`

**Test Plan**:
```gherkin
Given existing features FS-998, FS-999, FS-1000
When allocator scans for next ID
Then it should correctly identify FS-1001 as next

Given only FS-001 exists
When allocator scans for next ID
Then it should still correctly identify FS-002 (backward compatibility)
```

---

### T-005: Fix living-docs-sync.ts increment format check
**User Story**: US-001
**Satisfies ACs**: AC-US1-05
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/core/living-docs/living-docs-sync.ts`
- Line 353: Change `/^FS-\d{3}$/` to `/^FS-\d{3,}$/`

**Test Plan**:
```gherkin
Given a feature ID FS-1234
When living docs sync checks the format
Then it should accept FS-1234 as valid increment format

Given a feature ID FS-052
When living docs sync checks the format
Then it should still accept FS-052 (backward compatibility)
```

---

## Phase 3: Parsers

### T-006: Fix task-parser.ts patterns for T-XXX and US-XXX
**User Story**: US-002, US-003
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/generators/spec/task-parser.ts`
- Line 91: Change `/T-\d{3}E?/` to `/T-\d{3,}E?/`
- Line 92: Change `/US-\d{3}E?/` to `/US-\d{3,}E?/`
- Line 184: Change `/^T-\d{3}$/` to `/^T-\d{3,}$/`
- Line 268: Change `/^US-\d{3}$/` to `/^US-\d{3,}$/`
- Line 349: Change `/^US-(\d{3})$/` to `/^US-(\d{3,})$/`

**Test Plan**:
```gherkin
Given a task header "### T-1000: Large task"
When task parser parses the line
Then it should extract task ID T-1000

Given a user story reference "**User Story**: US-1234"
When task parser parses the line
Then it should extract user story ID US-1234

Given existing format "### T-001: Task" and "US-052"
When task parser parses these
Then they should still work (backward compatibility)
```

---

### T-007: Fix spec-parser.ts patterns for US-XXX
**User Story**: US-002
**Satisfies ACs**: AC-US2-03
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/generators/spec/spec-parser.ts`
- Line 216: Change `/US-\d{3}E?/` to `/US-\d{3,}E?/`
- Line 331: Change `/^US-(\d{3})$/` to `/^US-(\d{3,})$/`

**Test Plan**:
```gherkin
Given a spec header "### US-1000: Large user story"
When spec parser parses the file
Then it should extract user story ID US-1000

Given spec headers US-001 through US-999
When spec parser parses them
Then they should all still work (backward compatibility)
```

---

## Phase 4: Validators

### T-008: Fix three-file-validator.ts patterns for T-XXX
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/core/validation/three-file-validator.ts`
- Line 122: Change `/T-\d{3}/` to `/T-\d{3,}/`
- Line 128: Change `/T-\d{3}/` to `/T-\d{3,}/`
- Line 265: Change `/^###\s+T-\d{3}/` to `/^###\s+T-\d{3,}/`
- Line 281: Change `/T-\d{3}/` to `/T-\d{3,}/`
- Line 293: Change `/T-\d{3}/` to `/T-\d{3,}/`
- Line 305: Change `/T-\d{3}/` to `/T-\d{3,}/`

**Test Plan**:
```gherkin
Given a tasks.md with "### T-1000: Task title"
When three-file validator checks the file
Then it should correctly identify T-1000 as a valid task

Given tasks.md with T-001 through T-100
When three-file validator checks the file
Then all should be correctly identified (backward compatibility)
```

---

## Phase 5: External Integrations

### T-009: Fix github-service.ts US-XXX pattern
**User Story**: US-002
**Satisfies ACs**: AC-US2-05
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `src/core/feature-deleter/github-service.ts`
- Line 45: Change `\\[US-\\d{3}\\]` to `\\[US-\\d{3,}\\]`

**Test Plan**:
```gherkin
Given a GitHub issue with title "[FS-052][US-1000] Large user story"
When github-service searches for related issues
Then it should find the issue

Given issues with US-001 through US-999
When github-service searches for them
Then all should be found (backward compatibility)
```

---

### T-010: Fix user-story-issue-builder.ts patterns
**User Story**: US-001, US-002
**Satisfies ACs**: AC-US1-01, AC-US2-01, AC-US2-04
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- File: `plugins/specweave-github/lib/user-story-issue-builder.ts`
- Line 69: Change `/^FS-\d{3}$/` to `/^FS-\d{3,}$/`
- Line 118: Change `/^\[FS-\d{3}\]\[US-\d{3}\] .+$/` to `/^\[FS-\d{3,}\]\[US-\d{3,}\] .+$/`

**Test Plan**:
```gherkin
Given feature ID FS-1000 and user story US-2000
When building GitHub issue title
Then the pattern "[FS-1000][US-2000] Title" should be valid

Given feature ID FS-052 and user story US-001
When building GitHub issue title
Then the pattern "[FS-052][US-001] Title" should still be valid
```

---

## Phase 6: Testing & Documentation

### T-011: Add unit tests for 4+ digit IDs
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Priority**: P1
**Model**: sonnet

**Implementation**:
- Add test cases to existing test files for:
  - FS-1000, FS-1234, FS-9999
  - US-1000, US-5678, US-9999
  - T-1000, T-4321, T-9999
- Verify all existing 3-digit tests still pass

**Test Plan**:
```gherkin
Given the test suite
When running npm test
Then all new 4-digit ID tests should pass
And all existing 3-digit ID tests should pass
```

---

### T-012: Update test fixtures and integration tests
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Priority**: P2
**Model**: haiku

**Implementation**:
- Review test files that use hardcoded patterns:
  - `tests/integration/github-issue-title-validation.test.ts:235`
  - `tests/unit/feature-id-manager.test.ts:392`
  - `tests/integration/duplicate-prevention-e2e.test.ts:106`
- Update any test assertions that expect exactly 3 digits

**Test Plan**:
```gherkin
Given the integration test suite
When running npm run test:all
Then all tests should pass
And no test should fail due to 4-digit ID rejection
```

---

### T-013: Run full test suite and verify no regressions
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Priority**: P1
**Model**: haiku

**Implementation**:
- Run `npm run rebuild && npm test`
- Run `npm run test:all` if available
- Verify 80%+ coverage target maintained
- Fix any failing tests

**Test Plan**:
```gherkin
Given all code changes are complete
When running the full test suite
Then all tests should pass
And coverage should be >= 80%
```

---

### T-014: Update error messages and documentation
**User Story**: US-004
**Satisfies ACs**: AC-US4-05
**Status**: [x] completed
**Priority**: P2
**Model**: haiku

**Implementation**:
- `src/cli/commands/delete-feature.ts`: Update "exactly 3 digits" messages
- Remove example "FS-0520 (4 digits)" as invalid from error output
- Update any other user-facing messages that mention digit limits

**Test Plan**:
```gherkin
Given the delete-feature help/error output
When a user sees format requirements
Then it should say "3 or more digits" not "exactly 3 digits"
```

---

## Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| Core Validation | T-001, T-002 | P1 |
| Living Docs | T-003, T-004, T-005 | P1 |
| Parsers | T-006, T-007 | P1 |
| Validators | T-008 | P1 |
| Integrations | T-009, T-010 | P1 |
| Testing | T-011, T-012, T-013, T-014 | P1/P2 |

**Total**: 14 tasks
**Estimated effort**: 2-4 hours (mechanical regex changes + testing)
