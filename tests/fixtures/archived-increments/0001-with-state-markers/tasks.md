# Tasks: with-state-markers

### T-001: Confirm state-marker file parses
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given skill-chain-0001.json on disk → When the loader reads it → Then no error is thrown

### T-002: Confirm archived increment reopens
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending
**Test**: Given metadata.json with status "active" → When `sw:increment 0001` runs → Then it attaches to the existing session
