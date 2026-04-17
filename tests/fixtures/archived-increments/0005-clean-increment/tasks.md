# Tasks: clean-increment

### T-001: Load baseline fixture
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given a clean fixture with no deprecated flags → When loaded → Then no warnings are printed

### T-002: Verify standard file set
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Test**: Given a fixture directory → When listed → Then spec.md, plan.md, tasks.md, metadata.json are all present
