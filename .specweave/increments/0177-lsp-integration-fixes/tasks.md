# Tasks: LSP Integration Fixes

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

## Phase 1: TypeScript LSP Mapping (US-001)

### T-001: [RED] Write failing test for TypeScript keyword detection
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03
**Status**: [x] completed
**Phase**: RED
**Priority**: P0
**Model**: 💎 opus

**Description**:
Write test that verifies OFFICIAL_PLUGIN_MAP contains TypeScript-related keywords.
Test should fail because mappings don't exist yet.

**Test File**: `tests/integration/lazy-loading/official-plugin-manager.test.ts`

**Test Plan**:
- **Given**: OFFICIAL_PLUGIN_MAP constant
- **When**: Looking up 'typescript', 'react', 'node', 'javascript'
- **Then**: Each returns 'typescript-lsp'

---

### T-002: [GREEN] Add TypeScript mappings to OFFICIAL_PLUGIN_MAP
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-001 [RED] MUST be completed first

**Description**:
Add all TypeScript/JavaScript keyword mappings to OFFICIAL_PLUGIN_MAP.

**Keywords**:
```
typescript, ts, javascript, js, react, nextjs, next.js,
vue, angular, node, nodejs, express, nestjs, svelte
```

**Test Plan**:
- **Given**: T-001 test exists and fails
- **When**: Add mappings to OFFICIAL_PLUGIN_MAP
- **Then**: Test PASSES (green)

---

### T-003: [REFACTOR] Organize LSP mappings with comments
**User Story**: US-001
**Satisfies ACs**: AC-US1-04
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-002 [GREEN] MUST be completed first

**Description**:
Add section comment for TypeScript LSP mappings matching existing style.

**Test Plan**:
- **Given**: T-001 test passes
- **When**: Reorganize with comments
- **Then**: Test STILL passes (green)

---

## Phase 2: LSP Investigation & ADR (US-002)

### T-004: Investigate ENABLE_LSP_TOOL environment variable
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02
**Status**: [x] completed
**Priority**: P0
**Model**: 💎 opus

**Description**:
Test whether ENABLE_LSP_TOOL env var affects LSP tool availability:
1. Start Claude Code without env var
2. Start Claude Code with ENABLE_LSP_TOOL=true
3. Check if LSP tools appear in tool list

**Output**: Update ADR-0231 with findings

---

### T-005: Document LSP explicit vs implicit capabilities
**User Story**: US-002
**Satisfies ACs**: AC-US2-03, AC-US2-04
**Status**: [x] completed
**Priority**: P0
**Model**: 💎 opus
**Depends On**: T-004

**Description**:
Based on investigation, update ADR-0231:
- Document whether LSP provides callable tools or background enhancement
- Update ADR status from "Proposed" to "Accepted"

---

## Phase 3: Documentation Update (US-003)

### T-006: Update lsp-integration.md with accurate capabilities
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02
**Status**: [x] completed
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-005

**Description**:
Update docs-site/docs/guides/lsp-integration.md:
- Clarify background vs explicit capabilities
- Remove/correct references to non-existent commands
- Align with ADR-0231 findings

---

### T-007: Add LSP troubleshooting section
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed
**Priority**: P1
**Model**: ⚡ haiku
**Depends On**: T-006

**Description**:
Add troubleshooting section to lsp-integration.md:
- "Plugin enabled but not working"
- "Binary installed but no LSP"
- Common configuration issues

---

### T-008: Update CLAUDE.md LSP section if needed
**User Story**: US-003
**Satisfies ACs**: AC-US3-04
**Status**: [x] completed (no changes needed - already accurate)
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-006

**Description**:
Review CLAUDE.md LSP sections and update if findings require changes.

---

## Phase 4: Plugin Verification (US-004)

### T-009: [RED] Write failing test for plugin verification
**User Story**: US-004
**Satisfies ACs**: AC-US4-01
**Status**: [x] completed
**Phase**: RED
**Priority**: P1
**Model**: 💎 opus

**Description**:
Write test that verifies lsp-check.sh checks plugin installation status.
Test should fail because current script only checks binaries.

**Test File**: `tests/integration/hooks/lsp-plugin-verification.test.ts`

**Test Plan**:
- **Given**: Binary exists but plugin not installed
- **When**: lsp-check.sh runs
- **Then**: Warning includes plugin install command

---

### T-010: [GREEN] Add plugin verification to lsp-check.sh
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Phase**: GREEN
**Priority**: P1
**Model**: 💎 opus
**Depends On**: T-009 [RED] MUST be completed first

**Description**:
Add plugin verification to lsp-check.sh:
1. Check ~/.claude/plugins/installed_plugins.json
2. For each language with binary, verify plugin exists
3. Warn if binary present but plugin missing

**Test Plan**:
- **Given**: T-009 test exists and fails
- **When**: Add plugin verification logic
- **Then**: Test PASSES (green)

---

### T-011: [REFACTOR] Clean up lsp-check.sh output messages
**User Story**: US-004
**Satisfies ACs**: AC-US4-03
**Status**: [x] completed
**Phase**: REFACTOR
**Priority**: P2
**Model**: ⚡ haiku
**Depends On**: T-010 [GREEN] MUST be completed first

**Description**:
Improve warning message clarity:
- Consolidate binary vs plugin warnings
- Add exact `claude plugin install X@claude-plugins-official` command

**Test Plan**:
- **Given**: T-009 test passes
- **When**: Improve messages
- **Then**: Test STILL passes (green)

---

## Summary

| Phase | RED | GREEN | REFACTOR | User Story |
|-------|-----|-------|----------|------------|
| TypeScript Mapping | T-001 | T-002 | T-003 | US-001 |
| Investigation | - | T-004, T-005 | - | US-002 |
| Documentation | - | T-006, T-007, T-008 | - | US-003 |
| Plugin Verification | T-009 | T-010 | T-011 | US-004 |

**TDD Discipline**: RED → GREEN → REFACTOR (never skip steps!)
