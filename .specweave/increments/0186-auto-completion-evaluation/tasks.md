# Tasks for 0186-auto-completion-evaluation

## T-001: Add Success Criteria Types
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

Add SuccessCriterion types and DEFAULT_SUCCESS_CRITERIA to auto/types.ts.

**Test**: Given types.ts, When imported, Then SuccessCriterion and DEFAULT_SUCCESS_CRITERIA are exported.

---

## T-002: Create evaluate-completion CLI Command
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed

Create src/cli/commands/evaluate-completion.ts that:
1. Takes increment ID as argument
2. Reads tasks.md, spec.md, and success criteria
3. Calls Claude CLI with sonnet model
4. Returns CompletionEvaluationResult as JSON

**Test**: Given increment 0001, When `specweave evaluate-completion 0001` runs, Then JSON result with complete/reason/confidence is returned.

---

## T-003: Update Auto Command to Log Success Criteria
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

Update src/cli/commands/auto.ts to:
1. Build success criteria from config and project state
2. Store in auto-mode.json
3. Log success criteria summary to console

**Test**: Given `/sw:auto`, When session starts, Then success criteria are logged and stored.

---

## T-004: Integrate LLM Evaluation into Stop Hook
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

Update plugins/specweave/hooks/stop-auto.sh to:
1. Read requireLLMEval from config
2. Call `specweave evaluate-completion` when enabled
3. Add evaluation result to VALIDATION_ERRORS if not complete
4. Graceful fallback if CLI unavailable

**Test**: Given requireLLMEval=true, When stop hook fires, Then LLM evaluation runs before completion decision.

---

## T-005: Add Tests
**User Story**: US-002
**Satisfies ACs**: AC-US2-01
**Status**: [x] completed

Add tests for:
1. Success criteria types
2. evaluate-completion command (mocked Claude CLI)
3. Auto command success criteria logging

**Test**: Given test suite, When `npm test` runs, Then all new tests pass.
