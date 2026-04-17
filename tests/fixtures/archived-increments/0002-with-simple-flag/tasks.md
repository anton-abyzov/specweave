# Tasks: with-simple-flag

This increment was planned in `--simple` mode under SpecWeave 1.0.x. Under 1.1.0+, the flag is deprecated but must still be tolerated when loading archived work.

### T-001: Load increment launched with --simple
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given an archived `metadata.json` with `flags: ["--simple"]` → When loaded → Then no error is thrown

### T-002: Resume emits migration hint for --simple
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [ ] pending
**Test**: Given `--simple` in metadata → When resumed → Then the CLI prints a migration hint pointing to `--simple-compat`
