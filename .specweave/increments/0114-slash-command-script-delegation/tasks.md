# Tasks: Slash Command Script Delegation

### T-001: Create scripts folder and jobs.js
**User Story**: US-001, US-003
**Satisfies ACs**: AC-US1-01, AC-US3-01
**Status**: [x] completed

### T-002: Create progress.js script
**User Story**: US-003
**Satisfies ACs**: AC-US3-02
**Status**: [x] completed

### T-003: Create status.js script
**User Story**: US-003
**Satisfies ACs**: AC-US3-03
**Status**: [x] completed

### T-004: Modify user-prompt-submit.sh
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04
**Status**: [x] completed

### T-005: Add fallback handling
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02
**Status**: [x] completed

### T-006: Test implementation
**User Story**: US-002
**Satisfies ACs**: AC-US2-04
**Status**: [x] completed

Test results:
- /specweave:jobs: 68ms (was 3+ min)
- /specweave:status: <100ms
- /specweave:progress: <100ms

### T-007: Create instant-status skill
**User Story**: US-005
**Satisfies ACs**: AC-US5-01, AC-US5-02, AC-US5-03, AC-US5-04
**Status**: [x] completed

Created `plugins/specweave/skills/instant-status/SKILL.md` with:
- Activation keywords for status commands
- Instructions to execute scripts via Bash (portable to any LLM)
- Documentation of all three execution paths (hook, skill, CLI)

### T-008: Add --help to scripts
**User Story**: US-006
**Satisfies ACs**: AC-US6-01
**Status**: [x] completed

All scripts already have comprehensive `--help` handling:
- status.js: `node plugins/specweave/scripts/status.js --help`
- progress.js: `node plugins/specweave/scripts/progress.js --help`
- jobs.js: `node plugins/specweave/scripts/jobs.js --help`

### T-009: Create scripts README
**User Story**: US-006
**Satisfies ACs**: AC-US6-02, AC-US6-03
**Status**: [x] completed

Created `plugins/specweave/scripts/README.md` with comprehensive docs:
- Direct execution usage for all scripts
- CLI alternatives (`specweave status`, etc.)
- Three execution paths (hook, skill, CLI)
- When to use which approach
- Template for adding new instant commands
