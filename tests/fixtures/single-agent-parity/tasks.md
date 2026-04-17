# Tasks: Single-Agent Parity Fixture

### T-01: Write spec.md with acceptance criteria section
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [ ] pending
**Test Plan**: Given no spec.md exists → When single-agent planning runs → Then spec.md contains `## Acceptance Criteria` and `AC-US*-NN` IDs

### T-02: Write plan.md with Design and Rationale headings
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [ ] pending
**Test Plan**: Given spec.md exists → When single-agent writes plan.md → Then plan.md has `## Design` and `## Rationale`

### T-03: Write tasks.md with T-NN entries
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [ ] pending
**Test Plan**: Given plan.md exists → When single-agent writes tasks.md → Then tasks.md has `### T-NN` task entries

### T-04: Write rubric.md with Quality Contract heading
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [ ] pending
**Test Plan**: Given tasks.md exists → When single-agent writes rubric.md → Then rubric.md has `## Quality Contract`
