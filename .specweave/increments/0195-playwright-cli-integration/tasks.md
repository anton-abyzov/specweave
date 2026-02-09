# Tasks: 0195 - Playwright CLI Integration

## Phase 1: Research & Benchmarking (COMPLETED)

### T-001: [RED] Write benchmark test for CLI vs MCP token usage
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Test**: Given a standard page interaction (navigate + click + screenshot) → When executed via CLI and MCP separately → Then CLI token output is <500 tokens and MCP is >3000 tokens

### T-002: [GREEN] Install @playwright/cli and run benchmark
**Depends On**: T-001 | **Status**: [x] completed
**Test**: Given @playwright/cli is installed globally → When running benchmark test → Then token comparison data is collected and documented

### T-003: [RED] Write capability gap detection tests
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Test**: Given a list of MCP capabilities → When checking CLI equivalents → Then gaps are identified and documented with fallback strategy

### T-004: [GREEN] Document capability matrix CLI vs MCP
**Depends On**: T-003 | **Status**: [x] completed
**Test**: Given the capability gap tests → When analyzing results → Then a complete feature matrix exists in spec.md

## Phase 2: Detection & Installation (COMPLETED)

### T-005: [RED] Write CLI detection utility tests
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-03 | **Status**: [x] completed
**Test**: Given @playwright/cli is installed → When detection runs → Then returns { installed: true, version: "0.1.x", path: "/path" }
**Test**: Given @playwright/cli is NOT installed → When detection runs → Then returns { installed: false } without error

### T-006: [GREEN] Implement playwright-cli-detector utility
**Depends On**: T-005 | **Status**: [x] completed
**Test**: Given detection utility → When called → Then caches result in session and returns typed CliDetectionResult

### T-007: [REFACTOR] Optimize detection with version caching
**Depends On**: T-006 | **Status**: [x] completed
**Test**: Given detection was already run → When called again → Then returns cached result without subprocess call

### T-008: [RED] Write hook integration tests for CLI suggestion
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-02 | **Status**: [x] completed
**Test**: Given user-prompt-submit.sh processes a prompt with "E2E" keyword → When pluginAutoLoad.suggestOnly is true → Then CLI is suggested (not auto-installed)

### T-009: [GREEN] Update user-prompt-submit.sh with CLI detection
**Depends On**: T-008 | **Status**: [x] completed
**Test**: Given the hook script → When processing browser-related prompts → Then @playwright/cli is suggested alongside MCP plugin

## Phase 3: Skill Layer Integration (COMPLETED)

### T-010: [RED] Write CLI runner wrapper tests
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02, AC-US1-03 | **Status**: [x] completed
**Test**: Given CLI runner → When calling navigate("https://example.com") → Then returns success with page title
**Test**: Given CLI runner with headed:true config → When launching → Then browser is visible

### T-011: [GREEN] Implement playwright-cli-runner utility
**Depends On**: T-010 | **Status**: [x] completed
**Test**: Given CLI runner → When executing commands → Then daemon lifecycle is managed and output is parsed

### T-012: [RED] Write routing logic tests for skill layer
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03 | **Status**: [x] completed
**Test**: Given ui-automate task + CLI available → When routing → Then CLI is selected
**Test**: Given ui-inspect task + CLI available → When routing → Then MCP is selected
**Test**: Given any task + CLI NOT available → When routing → Then MCP is selected (fallback)

### T-013: [GREEN] Implement smart routing in sw-testing skills
**Depends On**: T-012 | **Status**: [x] completed
**Test**: Given updated skills → When invoked → Then correct tool is selected based on task type and availability

### T-014: [REFACTOR] Clean up skill routing and add configuration
**Depends On**: T-013 | **Status**: [x] completed
**Test**: Given config `testing.playwright.preferCli: false` → When routing → Then MCP is always preferred

## Phase 4: CI/CD & Documentation (COMPLETED)

### T-015: [RED] Write CI environment detection tests
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03 | **Status**: [x] completed
**Test**: Given CI=true env var → When CLI runner starts → Then headless mode is forced
**Test**: Given CLI runner with custom output dir → When screenshot taken → Then saved to configured path

### T-016: [GREEN] Implement CI defaults and output configuration
**Depends On**: T-015 | **Status**: [x] completed
**Test**: Given CI environment → When running CLI → Then all outputs go to configured directory with proper exit codes

### T-017: Update ADR-0226 with CLI integration decision
**User Story**: US-006 | **Satisfies ACs**: AC-US6-03 | **Status**: [x] completed
**Test**: Given ADR-0226 → When updated → Then documents dual-mode architecture decision

### T-018: Update testing guides with CLI vs MCP guidance
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-03 | **Status**: [x] completed
**Test**: Given documentation → When user reads testing guide → Then understands when to use CLI vs MCP

## Phase 5: Skill & Template Updates (COMPLETED)

### T-019: Update sw-testing:e2e-testing SKILL.md with CLI guidance
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [x] completed
**Test**: Given e2e-testing skill → When invoked → Then includes CLI vs MCP routing documentation

### T-020: Update ui-automate command with CLI-first routing
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02 | **Status**: [x] completed
**Test**: Given ui-automate command → When invoked → Then routes to CLI by default and documents CLI preference

### T-021: Update ui-inspect command with MCP preference
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03 | **Status**: [x] completed
**Test**: Given ui-inspect command → When invoked → Then documents MCP preference for DOM inspection

### T-022: Update e2e-setup command with CLI config section
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04 | **Status**: [x] completed
**Test**: Given e2e-setup command → When invoked → Then includes CLI configuration options

### T-023: Update CLAUDE.md template with browser automation mode
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 | **Status**: [x] completed
**Test**: Given CLAUDE.md template → When project initialized → Then includes CLI vs MCP guidance section

### T-024: Add testing.playwright config schema
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02 | **Status**: [x] completed
**Test**: Given config.json → When setting `testing.playwright.preferCli: true` → Then CLI is preferred in routing

## Phase 6: Public Docs & Content (COMPLETED)

### T-025: Update Playwright glossary term with CLI section
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01 | **Status**: [x] completed
**Test**: Given Playwright glossary → When user reads it → Then CLI mode is documented with token savings data

### T-026: Update YouTube tutorial script with dual-mode automation
**User Story**: US-007 | **Satisfies ACs**: AC-US7-02 | **Status**: [x] completed
**Test**: Given YouTube script → When filming → Then mentions CLI vs MCP and token efficiency

### T-027: Update E2E glossary cross-reference
**User Story**: US-007 | **Satisfies ACs**: AC-US7-03 | **Status**: [x] completed
**Test**: Given E2E glossary → When user reads it → Then cross-references Playwright CLI mode
