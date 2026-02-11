# Tasks: 0198 — Remove Official Plugin Dependency

## US-001: Remove from auto-install pipeline

### T-001: [RED] Write tests for LLM plugin detector without official plugins
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Test**: Given LLM plugin detector → When OFFICIAL_PLUGINS is checked → Then context7 and playwright are NOT in the array
**Test**: Given a coding prompt → When LLM detection runs → Then response does NOT recommend context7 or playwright

### T-002: [GREEN] Remove context7/playwright from OFFICIAL_PLUGINS and LLM prompt
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Depends On**: T-001

### T-003: [RED] Write tests for refresh-marketplace without official plugin installation
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Note**: Covered by existing tests + manual verification

### T-004: [GREEN] Remove context7/playwright from refresh-marketplace.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Depends On**: T-003

### T-005: [GREEN] Remove external plugin auto-install from user-prompt-submit.sh
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed

### T-006: [GREEN] Remove "essential" comments from plugin-installer.ts
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [x] completed

## US-002: Simplify Playwright routing to CLI-only

### T-007: [RED] Write tests for CLI-only Playwright routing
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02 | **Status**: [x] completed
**Test**: Given any task type → When resolvePlaywrightMode is called → Then returns 'cli'
**Test**: Given ui-inspect task → When resolvePlaywrightMode is called → Then returns 'cli' (not 'mcp')

### T-008: [GREEN] Simplify playwright-routing.ts to CLI-only
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Depends On**: T-007

### T-009: [REFACTOR] Clean up unused MCP types/imports in Playwright modules
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed
**Depends On**: T-008
**Note**: `task` param kept for API compatibility; `preferCli` deprecated via JSDoc

## US-003: Update documentation

### T-010: Update CLAUDE.md browser automation section
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed

### T-011: Update plugin management and troubleshooting docs
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02 | **Status**: [x] completed

### T-012: Remove Context7 MCP examples from mobile skill docs
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [x] completed
