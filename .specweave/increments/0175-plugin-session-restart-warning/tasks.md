---
increment: 0175-plugin-session-restart-warning
status: completed
testMode: TDD
coverageTarget: 90
phases:
  - detection
  - state-management
  - warning-display
  - integration
estimated_tasks: 18
---

# Tasks - Plugin Session Restart Warning

## TDD Contract

This increment uses **strict TDD enforcement**. Every feature follows RED → GREEN → REFACTOR:
1. 🔴 **RED**: Write failing test FIRST (test must fail initially)
2. 🟢 **GREEN**: Write minimal code to make test pass
3. 🔵 **REFACTOR**: Improve code quality while keeping tests green

---

## Phase 1: Detection Mechanism

### T-001: [RED] Write failing tests for plugin installation detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Phase**: RED
**Model**: 💎 opus

**Test Plan**:
```
Given hook output containing "sw installed" success message
When detectPluginInstallation() is called
Then it should return detected: true with plugin list

Given hook output with no plugin installation
When detectPluginInstallation() is called
Then it should return detected: false

Given output from "specweave init" with multiple plugins
When parseInstalledPlugins() is called
Then it should return array of all installed plugin names
```

**Guidance**:
- Create test file: `tests/unit/session/plugin-install-detector.test.ts`
- Test should FAIL initially (no implementation exists)
- Cover: specweave init, claude plugin install, manual triggers
- Mock hook output strings for various scenarios

---

### T-002: [GREEN] Implement plugin installation detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Phase**: GREEN
**Model**: 💎 opus
**Depends On**: T-001

**Test Plan**: Make T-001 tests pass with minimal code

**Guidance**:
- Create: `src/core/session/plugin-install-detector.ts`
- Implement detectPluginInstallation() function
- Implement parseInstalledPlugins() helper
- Use regex patterns to match installation output
- Keep it simple - just make tests pass

---

### T-003: [REFACTOR] Clean up plugin installation detector
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-02
**Status**: [x] completed
**Phase**: REFACTOR
**Model**: 💎 opus
**Depends On**: T-002

**Test Plan**: All T-001 tests must still pass after refactoring

**Guidance**:
- Extract constants for regex patterns
- Add JSDoc documentation
- Ensure consistent error handling
- Consider edge cases in pattern matching

---

## Phase 2: Session State Management

### T-004: [RED] Write failing tests for session state tracker
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: RED
**Model**: 💎 opus

**Test Plan**:
```
Given a new session starts
When initSessionState() is called
Then it should create empty state with sessionId

Given plugins are installed
When recordPluginInstallation() is called
Then state should include the installed plugins

Given state file exists
When loadSessionState() is called
Then it should return the persisted state

Given state needs to be cleared
When clearSessionState() is called
Then state file should be removed
```

**Guidance**:
- Create test file: `tests/unit/session/session-state.test.ts`
- Use temp directories for state files in tests
- Test file I/O operations with proper cleanup
- Tests should FAIL initially

---

### T-005: [GREEN] Implement session state tracker
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: GREEN
**Model**: 💎 opus
**Depends On**: T-004

**Test Plan**: Make T-004 tests pass with minimal code

**Guidance**:
- Create: `src/core/session/session-state.ts`
- Use `.specweave/state/session-state.json` for persistence
- Implement atomic writes to prevent corruption
- Handle missing state file gracefully

---

### T-006: [REFACTOR] Clean up session state tracker
**User Story**: US-001
**Satisfies ACs**: AC-US1-03, AC-US1-04
**Status**: [x] completed
**Phase**: REFACTOR
**Model**: 💎 opus
**Depends On**: T-005

**Test Plan**: All T-004 tests must still pass after refactoring

**Guidance**:
- Add type guards for state validation
- Improve error messages
- Add logging for debugging
- Consider state versioning for future migrations

---

## Phase 3: Warning Display

### T-007: [RED] Write failing tests for restart warning formatter
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Phase**: RED
**Model**: 💎 opus

**Test Plan**:
```
Given plugins were installed and project path
When formatRestartWarning() is called
Then output should contain "SESSION RESTART REQUIRED" banner

Given list of installed plugins
When formatRestartWarning() is called
Then each plugin should be listed with description

Given project path
When formatRestartWarning() is called
Then path should be displayed for user reference

Given warning options
When formatRestartWarning() is called
Then output should contain restart instructions
```

**Guidance**:
- Create test file: `tests/unit/session/restart-warning.test.ts`
- Test exact output formatting
- Verify all required sections present
- Tests should FAIL initially

---

### T-008: [GREEN] Implement restart warning formatter
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Phase**: GREEN
**Model**: 💎 opus
**Depends On**: T-007

**Test Plan**: Make T-007 tests pass with minimal code

**Guidance**:
- Create: `src/core/session/restart-warning.ts`
- Use chalk for colored output
- Include all required sections from spec
- Match the format shown in plan.md

---

### T-009: [REFACTOR] Clean up restart warning formatter
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03
**Status**: [x] completed
**Phase**: REFACTOR
**Model**: 💎 opus
**Depends On**: T-008

**Test Plan**: All T-007 tests must still pass after refactoring

**Guidance**:
- Extract string templates to constants
- Add plugin description mapping
- Ensure consistent styling
- Add tests for edge cases (long paths, many plugins)

---

## Phase 4: Handoff Context

### T-010: [RED] Write failing tests for handoff context generator
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Phase**: RED
**Model**: 💎 opus

**Test Plan**:
```
Given session state with installed plugins
When generateHandoffContext() is called
Then context should include summary of accomplishments

Given session state with project path
When generateHandoffContext() is called
Then context should include normalized project path

Given installed plugins
When generateHandoffContext() is called
Then context should list available skills from those plugins

Given complete session state
When formatHandoffText() is called
Then output should be copy-paste ready for new session
```

**Guidance**:
- Create test file: `tests/unit/session/handoff-context.test.ts`
- Test context generation logic
- Verify formatted text is actionable
- Tests should FAIL initially

---

### T-011: [GREEN] Implement handoff context generator
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Phase**: GREEN
**Model**: 💎 opus
**Depends On**: T-010

**Test Plan**: Make T-010 tests pass with minimal code

**Guidance**:
- Create: `src/core/session/handoff-context.ts`
- Map plugins to their skill descriptions
- Generate clear continuation prompts
- Keep context concise but complete

---

### T-012: [REFACTOR] Clean up handoff context generator
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04, AC-US3-05
**Status**: [x] completed
**Phase**: REFACTOR
**Model**: 💎 opus
**Depends On**: T-011

**Test Plan**: All T-010 tests must still pass after refactoring

**Guidance**:
- Add plugin metadata lookup
- Improve skill descriptions
- Add original intent capture if available
- Optimize text formatting

---

## Phase 5: Plugin Installer Integration

### T-013: [RED] Write failing tests for plugin installer flag creation
**User Story**: US-001, US-004
**Satisfies ACs**: AC-US1-01, AC-US4-04
**Status**: [x] completed
**Phase**: RED
**Model**: 💎 opus

**Test Plan**:
```
Given successful plugin installation via specweave init
When installation completes
Then flag file should be created at .specweave/state/plugins-installed-this-session.flag

Given plugins installed
When installation completes
Then installed-plugins.txt should contain plugin names

Given multiple plugin installations
When second installation happens
Then flag file should append new plugins
```

**Guidance**:
- Create test file: `tests/unit/init/plugin-installer-flags.test.ts`
- Test file creation in temp directory
- Verify file contents match expectations
- Tests should FAIL initially (feature not implemented)

---

### T-014: [GREEN] Modify plugin installer to create flag files
**User Story**: US-001, US-004
**Satisfies ACs**: AC-US1-01, AC-US4-04
**Status**: [x] completed
**Phase**: GREEN
**Model**: 💎 opus
**Depends On**: T-013

**Test Plan**: Make T-013 tests pass with minimal code

**Guidance**:
- Modify: `src/cli/helpers/init/plugin-installer.ts`
- After successful install, create flag file
- Write installed plugin names to text file
- Use atomic write operations

---

### T-015: [REFACTOR] Clean up plugin installer integration
**User Story**: US-001, US-004
**Satisfies ACs**: AC-US1-01, AC-US4-04
**Status**: [x] completed
**Phase**: REFACTOR
**Model**: 💎 opus
**Depends On**: T-014

**Test Plan**: All T-013 tests must still pass after refactoring

**Guidance**:
- Extract flag file paths to constants
- Add error handling for file operations
- Ensure cleanup on uninstall scenarios
- Add debug logging

---

## Phase 6: CLI Command & Hook Integration

### T-016: [RED] Write failing tests for session-warning CLI command
**User Story**: US-002, US-004
**Satisfies ACs**: AC-US2-04, AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Phase**: RED
**Model**: 💎 opus

**Test Plan**:
```
Given plugins list and project path as arguments
When specweave session-warning runs
Then warning should be displayed to stdout

Given warning is displayed
When command completes
Then it should exit with special code or marker

Given --acknowledge flag passed
When command runs
Then warning should display but allow continuation
```

**Guidance**:
- Create test file: `tests/unit/cli/session-warning.test.ts`
- Test CLI argument parsing
- Test output content
- Test exit behavior

---

### T-017: [GREEN] Implement session-warning CLI command
**User Story**: US-002, US-004
**Satisfies ACs**: AC-US2-04, AC-US4-01, AC-US4-02, AC-US4-03
**Status**: [x] completed
**Phase**: GREEN
**Model**: 💎 opus
**Depends On**: T-016

**Test Plan**: Make T-016 tests pass with minimal code

**Guidance**:
- Create: `src/cli/commands/session-warning.ts`
- Wire up to main CLI (yargs/commander)
- Call warning formatter and context generator
- Output halt marker for hook detection

---

### T-018: [REFACTOR] Clean up and add hook integration
**User Story**: US-002, US-004
**Satisfies ACs**: AC-US2-04, AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-04
**Status**: [x] completed
**Phase**: REFACTOR
**Model**: 💎 opus
**Depends On**: T-017

**Test Plan**: All T-016 tests must still pass after refactoring

**Guidance**:
- Add hook template modifications
- Document hook integration in comments
- Add integration test for full flow
- Update template hooks to include detection logic

---

## Completion Checklist

- [x] All TDD triplets completed (RED → GREEN → REFACTOR)
- [x] All tests passing (104 tests)
- [x] Coverage ≥ 90% (core/session: 95.83%)
- [x] No linting errors (project uses TypeScript strict mode)
- [x] Documentation updated (JSDoc in all modules)
- [x] Hook templates already integrated (user-prompt-submit.sh:254-265)
