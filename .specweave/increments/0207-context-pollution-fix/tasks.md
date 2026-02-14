# Tasks: 0207 Context Pollution Fix

## Phase 1: Hook Output Reduction

### T-001: Shrink SKILL FIRST message
**AC**: AC-US1-02 | **Status**: [x] completed
Reduced from ~1,457 chars to ~300 chars.

### T-002: Shrink DEEP_INTERVIEW_MSG
**AC**: AC-US1-02 | **Status**: [x] completed
Reduced from ~1,190 chars to ~100 chars.

### T-003: Shrink TDD strict enforcement block
**AC**: AC-US1-03 | **Status**: [x] completed
Reduced from ~1,036 chars to ~100 chars.

### T-004: Shrink Brain Message builder
**AC**: AC-US1-04 | **Status**: [x] completed
Reduced from ~6,207 chars to ~500 chars.

### T-005: Reduce MAX_ADDITIONAL_CONTEXT_LENGTH to 3000
**AC**: AC-US1-05 | **Status**: [x] completed
Changed from 8000 to 3000.

### T-006: Shrink LSP warning and other messages
**AC**: AC-US1-01 | **Status**: [x] completed
Shrunk LSP, hotfix, reopen, small_fix, interview gate messages.

## Phase 2: CLAUDE.md Trimming

### T-007: Trim TDD, Sync, Testing, MCP, Secrets, Plugin, Auto, Contributor sections
**AC**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
CLAUDE.md reduced from 16,255 to 10,883 chars (33%).

### T-008: Remove Automatic Enforcement table
**AC**: AC-US2-01 | **Status**: [x] completed
Removed duplicate enforcement table.

### T-009: Update CLAUDE.md template
**AC**: AC-US2-03 | **Status**: [x] completed
Template reduced from ~18K to 8,630 chars.

## Phase 3: MEMORY.md Cleanup

### T-010: Remove historical audit notes and DCI details
**AC**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
Removed Skills audit history and DCI implementation details.

### T-011: Deduplicate Plan-First Discipline
**AC**: AC-US3-02 | **Status**: [x] completed
Reduced to single-line reference to CLAUDE.md. MEMORY.md: 1,540 chars (from 5,958).

## Phase 4: Top 5 SKILL.md Trimming

### T-012: Trim done/SKILL.md (49K -> 18K)
**AC**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
Trimmed to 6,343 chars (87% reduction).

### T-013: Trim save/SKILL.md (38K -> 12K)
**AC**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
Trimmed to 3,780 chars (90% reduction).

### T-014: Trim auto/SKILL.md (37K -> 15K)
**AC**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
Trimmed to 7,018 chars (81% reduction).

### T-015: Trim do/SKILL.md (37K -> 14K)
**AC**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
Trimmed to 5,150 chars (86% reduction).

### T-016: Trim validate/SKILL.md (31K -> 12K)
**AC**: AC-US4-01, AC-US4-02 | **Status**: [x] completed
Trimmed to 4,911 chars (84% reduction).

## Phase 5: Skill Description Trimming

### T-017: Audit and trim verbose skill descriptions
**AC**: AC-US5-01 | **Status**: [x] completed
Total descriptions: 15,307 chars (from 17,589). 15 longest trimmed to under 200 chars each.

## Verification

### T-018: Run tests and verify sizes
**Status**: [x] completed
654 test files passed (0 failures), 17,653 tests green. All size targets met.
