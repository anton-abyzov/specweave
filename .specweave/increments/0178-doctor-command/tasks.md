# Tasks

## Completed

### T-001: Create types for doctor module
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given types file → When imported → Then provides CheckResult, DoctorReport, etc.

### T-002: Implement EnvironmentChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given project root → When checking → Then reports Node.js, Git, Claude CLI status

### T-003: Implement ProjectStructureChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Test**: Given project root → When checking → Then validates .specweave structure

### T-004: Implement ConfigurationChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03 | **Status**: [x] completed
**Test**: Given project root → When checking → Then validates config.json and CLAUDE.md

### T-005: Implement HooksChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Test**: Given project root → When checking → Then reports hook health

### T-006: Implement PluginsChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-05 | **Status**: [x] completed
**Test**: Given project root → When checking → Then reports plugin status

### T-007: Implement IncrementsChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-06 | **Status**: [x] completed
**Test**: Given project root → When checking → Then validates increment integrity

### T-008: Implement GitChecker
**User Story**: US-001 | **Satisfies ACs**: AC-US1-07 | **Status**: [x] completed
**Test**: Given project root → When checking → Then reports git status

### T-009: Create main doctor orchestrator
**User Story**: US-001 | **Satisfies ACs**: AC-US1-08 | **Status**: [x] completed
**Test**: Given project root → When running doctor → Then produces comprehensive report

### T-010: Create CLI command
**User Story**: US-001 | **Satisfies ACs**: AC-US1-09, AC-US1-10, AC-US1-11, AC-US1-12 | **Status**: [x] completed
**Test**: Given specweave doctor → When running → Then outputs report with correct exit code
