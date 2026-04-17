# Tasks: with-extended-thinking

### T-001: Verify archived judge-llm output
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01 | **Status**: [x] completed
**Test**: Given a historical note mentioning "extended thinking" in spec.md → When the spec is re-read under 1.1.0 → Then parsing succeeds without warnings

### T-002: Confirm legacy report mode survives
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Test**: Given a judge-llm-report.json with `"mode": "ultrathink"` → When the CLI reads it → Then the report is treated as a valid historical record (even though 1.1.0 emits `adaptive-thinking`)
