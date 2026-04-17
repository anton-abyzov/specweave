# Spec: with-extended-thinking

This increment was planned and closed under SpecWeave 1.0.x where "extended thinking" was the default for judge-llm. Historical wording is preserved to ensure the 0669 alignment does not break archived content.

## User Stories

### US-001: Historical judge-llm run with extended thinking
**As a** reviewer reading the archive
**I want** references to "extended thinking" to stay intact in archived specs
**So that** historical decisions remain auditable.

#### Acceptance Criteria
- [x] AC-US1-01: Archived spec.md referencing "extended thinking" is readable after upgrade
- [x] AC-US1-02: Closure report is not invalidated by the terminology change

### US-002: Report metadata survives renaming
**As a** compliance auditor
**I want** `mode: "ultrathink"` in historical reports to stay interpretable
**So that** past judgments can be traced back to the original API surface.

#### Acceptance Criteria
- [x] AC-US2-01: judge-llm-report.json with legacy mode string loads without error
