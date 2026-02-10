# Tasks: LSP Plugin Dependency Auto-Install

## Task Notation

- `[T-###]`: Task ID
- `[RED]`: Write failing test first
- `[GREEN]`: Make test pass with minimal code
- `[REFACTOR]`: Improve code quality, keep tests green
- `[ ]`: Not started
- `[x]`: Completed
- Model hints: ⚡ haiku (simple), 💎 opus (default)

## TDD Contract

**This increment uses TDD mode. For EVERY feature:**
1. **RED**: Write failing test FIRST
2. **GREEN**: Minimal code to pass test
3. **REFACTOR**: Clean up while keeping tests green

**CRITICAL**: Complete [RED] tasks before their [GREEN] counterpart!

---

## Phase 1: Fix Session Start Hook Chain (US-002)

### T-001: [RED] Write failing test for session-start lsp-check spawn
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write a test that verifies session-start dispatcher calls lsp-check.sh.
The test should mock the script execution and verify spawn is called.

**Test File**: `tests/integration/hooks/session-start-lsp-check.test.ts`

**Test Plan**:
- **Given**: Session start hook executes in a SpecWeave project
- **When**: Hook completes
- **Then**: lsp-check.sh was spawned in background with PROJECT_ROOT argument

---

### T-002: [GREEN] Implement lsp-check spawn in session-start dispatcher
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-001 [RED] MUST be completed first

**Description**:
Add lsp-check.sh spawn to `hooks/v2/dispatchers/session-start.sh`.
Copy the working code from `hooks/v2/session-start.sh` (lines 159-167).

**Test Plan**:
- **Given**: T-001 test exists and fails
- **When**: Add lsp-check spawn code to dispatcher
- **Then**: Test PASSES (green)

---

### T-003: [REFACTOR] Clean up session-start hook (optional)
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-002 [GREEN] MUST be completed first

**Description**:
Review and clean up any duplication between session-start.sh files.
Ensure consistent error handling.

**Implementation**: Added deprecation notice to source file, removed duplicate LSP check code, clarified dispatcher as active hook.

**Test Plan**:
- **Given**: T-001 test passes
- **When**: Refactor code, run test
- **Then**: Test STILL passes (green)

---

## Phase 2: LSP Binary Detection Mapping (US-001)

### T-004: [RED] Write failing test for plugin-to-binary mapping
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that verifies lsp-check.sh has mappings for all official LSP plugins:
csharp-lsp→csharp-ls, typescript-lsp→typescript-language-server, etc.

**Test File**: `tests/integration/hooks/lsp-binary-mapping.test.ts`

**Test Plan**:
- **Given**: lsp-check.sh script exists
- **When**: Parse script for binary check logic
- **Then**: All 5 official LSP plugins have corresponding binary checks

---

### T-005: [GREEN] Add missing binary mappings to lsp-check.sh
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed (mappings already existed)
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-004 [RED] MUST be completed first

**Description**:
Ensure lsp-check.sh has checks for all binaries with correct install commands.

**Test Plan**:
- **Given**: T-004 test exists and fails
- **When**: Update lsp-check.sh with complete mappings
- **Then**: Test PASSES (green)

---

### T-006: [REFACTOR] Improve lsp-check.sh maintainability
**User Story**: US-001
**Satisfies ACs**: AC-US1-03
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-005 [GREEN] MUST be completed first

**Description**:
Extract binary mappings to a data structure for easier maintenance.

**Implementation**: Created LANGUAGE_CONFIGS array with format "Language|extensions|binaries|install_cmd". Added count_extensions() and has_any_binary() utility functions.

**Test Plan**:
- **Given**: T-004 test passes
- **When**: Refactor code
- **Then**: Test STILL passes (green)

---

## Phase 3: Explicit LSP Request Detection (US-003)

### T-007: [RED] Write failing test for LSP request detection
**User Story**: US-003
**Satisfies ACs**: AC-US3-01
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that verifies user-prompt-submit.sh detects explicit LSP requests
like "use LSP", "with LSP", "LSP findReferences".

**Test File**: `tests/integration/hooks/lsp-request-detection.test.ts`

**Test Plan**:
- **Given**: Prompt contains "find references with LSP"
- **When**: user-prompt-submit.sh processes prompt
- **Then**: Hook outputs explanation message about LSP limitations

---

### T-008: [GREEN] Implement LSP request detection in user-prompt-submit.sh
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-007 [RED] MUST be completed first

**Description**:
Add detection for explicit LSP requests and return explanation message.

**Test Plan**:
- **Given**: T-007 test exists and fails
- **When**: Add LSP request detection code
- **Then**: Test PASSES (green)

---

### T-009: [REFACTOR] Improve LSP detection message clarity
**User Story**: US-003
**Satisfies ACs**: AC-US3-02, AC-US3-03
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-008 [GREEN] MUST be completed first

**Description**:
Improve the explanation message to be clearer and more helpful.

**Implementation**: Softened tone (💡 instead of ⚠️), focused on what Claude CAN do, added specific IDE shortcuts (F12, Shift+F12), clarified how LSP helps passively.

**Test Plan**:
- **Given**: T-007 test passes
- **When**: Improve message wording
- **Then**: Test STILL passes (green)

---

## Summary

| Phase | RED | GREEN | REFACTOR | User Story |
|-------|-----|-------|----------|------------|
| Fix Hook Chain | T-001 | T-002 | T-003 | US-002 |
| Binary Mapping | T-004 | T-005 | T-006 | US-001 |
| LSP Detection | T-007 | T-008 | T-009 | US-003 |

**TDD Discipline**: RED → GREEN → REFACTOR (never skip steps!)
